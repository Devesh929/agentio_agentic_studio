"""Synthetic deterministic KYC/AML reference engine for TESSERA Level 2.
Not an actual AML risk engine, regulatory implementation, or loan underwriting system.
"""
from __future__ import annotations

from copy import deepcopy
from datetime import date
import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = ROOT / 'fixtures'
REFERENCE_CONFIG = FIXTURES_DIR / 'level2_expected' / '02_Validated_KYC_AML_Config_Level2.json'
SCHEMA_FILE = FIXTURES_DIR / 'sample_loan_project' / '05_Target_Implementation_Schema.json'
SOURCE_CONTRACT = FIXTURES_DIR / 'sample_loan_project' / '07_Source_API_Contract.json'
CASE_DIR = FIXTURES_DIR / 'level2_inputs' / 'scenarios'


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def active_config() -> dict:
    return load_json(REFERENCE_CONFIG)


def _get_path(data: dict, path: str) -> tuple[bool, Any]:
    current: Any = data
    for component in path.split('.'):
        if not isinstance(current, dict) or component not in current:
            return False, None
        current = current[component]
    return True, current


def _set_path(data: dict, path: str, value: Any) -> None:
    current = data
    parts = path.split('.')
    for component in parts[:-1]:
        current = current.setdefault(component, {})
    current[parts[-1]] = value


def validate_configuration(config: dict) -> list[dict]:
    schema = load_json(SCHEMA_FILE)
    errors = [
        {'code': 'JSON_SCHEMA', 'path': '/'+'/'.join(map(str, e.absolute_path)), 'message': e.message}
        for e in Draft202012Validator(schema).iter_errors(config)
    ]
    # Semantic constraints cannot be encoded in the provided target schema alone.
    risk = config.get('risk', {})
    if isinstance(risk.get('medium_score_max'), int) and isinstance(risk.get('high_risk_score_min'), int):
        if risk['high_risk_score_min'] != risk['medium_score_max'] + 1:
            errors.append({'code': 'RISK_BAND_GAP_OVERLAP', 'path': '/risk', 'message': 'Medium max + 1 must equal high min.'})
    if isinstance(risk.get('low_score_max'), int) and isinstance(risk.get('medium_score_max'), int):
        if risk['medium_score_max'] < risk['low_score_max'] + 1:
            errors.append({'code': 'RISK_BAND_OVERLAP', 'path': '/risk', 'message': 'Medium risk band must not overlap low risk.'})
    income = config.get('income', {})
    if isinstance(income.get('lookback_months'), int) and isinstance(income.get('min_qualifying_months'), int):
        if income['min_qualifying_months'] > income['lookback_months']:
            errors.append({'code': 'INCOME_POLICY_CONFLICT', 'path': '/income', 'message': 'Qualifying months must be <= lookback months.'})
    workflow = config.get('workflow', {})
    states = set(workflow.get('states') or [])
    required_states = {'intake', 'incomplete', 'identity_verification', 'manual_identity_review', 'screening', 'on_hold_screening', 'risk_assessment', 'pending_edd', 'pending_senior_review', 'final_decision', 'approved', 'rejected', 'blocked_sanctions'}
    for missing in sorted(required_states-states):
        errors.append({'code': 'MISSING_WORKFLOW_STATE', 'path': '/workflow/states', 'message': f'Missing state: {missing}'})
    if income.get('salaried_failure_route') == 'manual_review' and 'manual_income_review' not in states:
        errors.append({'code': 'MISSING_INCOME_REVIEW_STATE', 'path': '/workflow/states', 'message': 'Clarified income policy requires a manual_income_review state (Level 2 workflow extension).'})
    mapped_targets = [m.get('target_path') for m in config.get('field_mappings', [])]
    if len(mapped_targets) != len(set(mapped_targets)):
        errors.append({'code': 'DUPLICATE_TARGET_MAPPING', 'path': '/field_mappings', 'message': 'Multiple source fields map to the same target.'})
    return errors


def validate_mappings(record: dict, mappings: list[dict]) -> dict:
    mapped: dict = {}
    failures = []
    mapped_sources = []
    target_set = set()
    for mapping in mappings:
        source, target = mapping.get('source_path', ''), mapping.get('target_path', '')
        if target in target_set:
            failures.append({'code': 'DUPLICATE_TARGET', 'target': target})
        target_set.add(target)
        exists, val = _get_path(record, source)
        if not exists:
            failures.append({'code': 'MISSING_SOURCE_FIELD', 'source': source, 'target': target, 'required': bool(mapping.get('required'))})
            continue
        mapped_sources.append(source)
        transform = (mapping.get('transformation') or '').lower()
        if 'trim' in transform and isinstance(val, str):
            val = val.strip()
        if 'iso 8601' in transform:
            try:
                date.fromisoformat(val)
            except (TypeError, ValueError):
                failures.append({'code': 'BAD_DATE_FORMAT', 'source': source})
                continue
        if 'validate 0..100' in transform and (not isinstance(val, int) or isinstance(val,bool) or not 0 <= val <= 100):
            failures.append({'code': 'BAD_RISK_SCORE', 'source': source})
            continue
        _set_path(mapped, target, val)
    return {'valid': not any(x.get('required', True) for x in failures), 'mapped': mapped, 'issues': failures, 'mapped_count': len(mapped_sources)}


def _stable_income(record: dict, config: dict, as_of: str) -> tuple[bool, str]:
    policy = config['income']
    category = record.get('income', {}).get('employment_type')
    if category == 'self_employed':
        return False, 'Self-employed applications require manual income review by the approved clarification.'
    if category != 'salaried':
        return False, 'Unrecognized employment category requires manual review.'
    as_of_d = date.fromisoformat(as_of)
    # Use only complete calendar months strictly before as_of month.
    start_month = as_of_d.year*12 + as_of_d.month - int(policy['lookback_months'])
    end_month = as_of_d.year*12 + as_of_d.month
    qualified = set()
    for row in record.get('income', {}).get('salary_credits', []):
        try:
            ym = str(row['month'])
            year, month = map(int, ym.split('-'))
            score = year*12+month
            val = int(row['amount_inr'])
            if start_month <= score < end_month and val >= policy['minimum_monthly_credit_inr']:
                qualified.add(ym)
        except (ValueError, KeyError, TypeError):
            continue
    return len(qualified) >= policy['min_qualifying_months'], f'{len(qualified)} qualifying months of required {policy["min_qualifying_months"]}'


def evaluate(record: dict, config: dict | None = None, *, identity_result: str = 'pass', decisions: dict | None = None, as_of: str = '2026-10-31') -> dict:
    """Recompute state deterministically from source inputs and explicit human decisions.
    decisions: identity, screening_status, income, edd, senior = approved/rejected or clear/confirmed_match.
    """
    config = config or active_config()
    decisions = decisions or {}
    errors = validate_configuration(config)
    if errors:
        return {'state': 'configuration_invalid', 'path': [], 'errors': errors, 'review_queue': []}
    path = ['intake']
    mandatory = ['customer.first_name', 'customer.last_name', 'customer.dob_iso', 'customer.govt_id_masked', 'customer.phone_e164', 'customer.residential_address', 'application.requested_loan_inr']
    missing = [k for k in mandatory if (not _get_path(record,k)[0]) or _get_path(record,k)[1] in ('',None)]
    if missing:
        path.append('incomplete')
        return {'state':'incomplete','path':path, 'missing_fields':missing,'review_queue':[]}
    amount = record['application']['requested_loan_inr']
    risk = record.get('aml', {}).get('risk_score')
    status = decisions.get('screening_status',record.get('screening',{}).get('sanctions_status'))
    pep = record.get('screening',{}).get('pep_flag')
    if not isinstance(amount,int) or isinstance(amount,bool) or amount <= 0:
        return {'state': 'invalid_input', 'path': path, 'errors': [{'field':'application.requested_loan_inr','message':'Expected positive integer'}], 'review_queue': []}
    if not isinstance(risk,int) or isinstance(risk,bool) or not 0 <= risk <= 100:
        return {'state': 'invalid_input', 'path': path, 'errors': [{'field':'aml.risk_score','message':'Expected integer in 0..100'}], 'review_queue': []}
    if status not in ('clear','possible_match','confirmed_match') or not isinstance(pep,bool):
        return {'state': 'invalid_input', 'path': path, 'errors': [{'field':'screening','message':'Invalid sanctions status or PEP flag'}], 'review_queue': []}
    path.append('identity_verification')
    if identity_result != 'pass':
        path.append('manual_identity_review')
        if decisions.get('identity') == 'rejected':
            path.append('rejected')
            return {'state':'rejected','path':path,'review_queue':[],'reason':'Identity verification rejected'}
        if decisions.get('identity') != 'approved':
            return {'state':'manual_identity_review','path':path,'review_queue':['manual_identity_review']}
    path.append('screening')
    if status == 'confirmed_match':
        path.append('blocked_sanctions')
        return {'state':'blocked_sanctions','path':path,'review_queue':[],'reason':'Confirmed sanctions match overrides all other reviews'}
    if status == 'possible_match':
        path.append('on_hold_screening')
        return {'state':'on_hold_screening','path':path,'review_queue':['on_hold_screening']}
    path.append('risk_assessment')
    income_pass, income_detail = _stable_income(record,config,as_of)
    require_edd = pep or risk >= config['risk']['high_risk_score_min'] or amount >= config['loan_value']['high_value_edd_threshold_inr']
    require_senior = amount >= config['loan_value']['senior_review_threshold_inr']
    queue = []
    if not income_pass:
        queue.append('manual_income_review')
    if require_edd:
        queue.append('pending_edd')
    if require_senior:
        queue.append('pending_senior_review')
    for review in queue:
        path.append(review)
        key = {'manual_income_review':'income','pending_edd':'edd','pending_senior_review':'senior'}[review]
        if decisions.get(key) == 'rejected':
            path.append('rejected')
            return {'state':'rejected','path':path,'review_queue':queue,'reason':f'{review} rejected','income_detail':income_detail}
        if decisions.get(key) != 'approved':
            return {'state':review,'path':path,'review_queue':queue,'income_detail':income_detail,'edd_required':require_edd,'senior_required':require_senior}
    path.extend(['final_decision','approved'])
    return {'state':'approved','path':path,'review_queue':queue,'income_detail':income_detail,'edd_required':require_edd,'senior_required':require_senior,'meaning':'KYC/AML clearance only; NOT loan underwriting approval'}


ROLE_BY_STATE = {
    'incomplete':'customer_service',
    'manual_identity_review':'kyc_analyst',
    'on_hold_screening':'compliance_officer',
    'manual_income_review':'credit_analyst',
    'pending_edd':'compliance_officer',
    'pending_senior_review':'senior_compliance_officer',
}

ACTION_KEY = {
    'manual_identity_review': 'identity',
    'on_hold_screening':'screening_status',
    'manual_income_review':'income',
    'pending_edd':'edd',
    'pending_senior_review':'senior',
}


def apply_action(application: dict, action: str, reviewer_role: str, actor_id: str, *, value: str | None = None, additional_fields: dict | None = None, config: dict | None = None) -> dict:
    current = application['evaluation']['state']
    if current not in ROLE_BY_STATE:
        raise ValueError(f'No review action allowed while in {current}')
    if ROLE_BY_STATE[current] != reviewer_role:
        raise ValueError(f'{current} requires role {ROLE_BY_STATE[current]}')
    if not actor_id.strip():
        raise ValueError('Actor ID is mandatory for audit trail')
    if current == 'incomplete':
        if action != 'supply_information' or not isinstance(additional_fields,dict):
            raise ValueError('Required action: supply_information with additional_fields')
        for k,v in additional_fields.items():
            if k not in ('customer.dob_iso', 'customer.first_name', 'customer.last_name', 'customer.govt_id_masked', 'customer.phone_e164', 'customer.residential_address', 'application.requested_loan_inr'):
                raise ValueError('Only missing mandatory fields may be supplied')
            _set_path(application['record'],k,v)
    elif current == 'on_hold_screening':
        if action != 'resolve_screening' or value not in ('clear','confirmed_match'):
            raise ValueError('Use resolve_screening with clear or confirmed_match')
        application['decisions']['screening_status'] = value
    else:
        if action != 'review' or value not in ('approved','rejected'):
            raise ValueError('Use review with approved or rejected')
        application['decisions'][ACTION_KEY[current]] = value
    application['audit_events'].append({'actor_id':actor_id,'role':reviewer_role,'from_state':current,'action':action,'value':value,'additional_fields':deepcopy(additional_fields) if additional_fields else None})
    application['evaluation'] = evaluate(application['record'],config or active_config(),identity_result=application['identity_result'],decisions=application['decisions'],as_of=application['as_of'])
    return application


def build_application(case: dict, config: dict | None = None) -> dict:
    record = deepcopy(case['source_record'])
    identity_result = case.get('simulation',{}).get('identity_result','pass')
    as_of = case.get('as_of','2026-10-31')
    app = {'case_id':case.get('case_id','custom'),'record':record,'identity_result':identity_result,'as_of':as_of,'decisions':{},'audit_events':[]}
    app['evaluation']=evaluate(record,config or active_config(),identity_result=identity_result,decisions={},as_of=as_of)
    return app


def run_case(case: dict, *, include_actions: bool = True, config: dict | None = None) -> dict:
    app=build_application(case,config)
    initial=app['evaluation']['state']
    for action in case.get('actions',[]) if include_actions else []:
        apply_action(app,action['action'],action['role'],action.get('actor_id','synthetic-reviewer'),value=action.get('value'),additional_fields=action.get('additional_fields'),config=config)
    return {'case_id':case.get('case_id'),'initial_state':initial,'final_state':app['evaluation']['state'],'path':app['evaluation']['path'],'review_queue':app['evaluation'].get('review_queue',[]),'audit_events':app['audit_events'], 'evaluation':app['evaluation']}
