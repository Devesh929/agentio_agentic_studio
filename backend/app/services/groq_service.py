import os
import json
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        self.client = None
        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
            except Exception:
                self.client = None

    def get_status(self) -> Dict[str, Any]:
        has_key = bool(self.api_key and len(self.api_key) > 8)
        masked_key = ""
        if has_key:
            masked_key = self.api_key[:4] + "..." + self.api_key[-4:]

        models = [
            {"id": "openai/gpt-oss-20b", "name": "GPT-OSS 20B (Balanced)", "context_window": 32768, "tier": "free"},
            {"id": "openai/gpt-oss-120b", "name": "GPT-OSS 120B (Thorough)", "context_window": 32768, "tier": "free"},
            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B Versatile", "context_window": 128000, "tier": "free"},
            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant (Economy)", "context_window": 128000, "tier": "free"}
        ]

        # Check LlamaCloud key as well
        llama_key = settings.LLAMA_CLOUD_API_KEY or os.getenv("LLAMA_CLOUD_API_KEY", "")
        has_llama_key = bool(llama_key and len(llama_key) > 8)
        masked_llama_key = ""
        if has_llama_key:
            masked_llama_key = llama_key[:4] + "..." + llama_key[-4:]

        return {
            "groq": {
                "configured": has_key,
                "masked_key": masked_key,
                "primary_model": settings.GROQ_PRIMARY_MODEL,
                "complex_model": settings.GROQ_COMPLEX_MODEL,
                "reasoning_effort": settings.GROQ_REASONING_EFFORT,
                "available_models": models
            },
            "llama_cloud": {
                "configured": has_llama_key,
                "masked_key": masked_llama_key,
                "tier": settings.LLAMA_PARSE_TIER,
                "enabled": settings.LLAMA_PARSE_ENABLED
            },
            "demo_mode": settings.DEMO_MODE,
            "offline_mode_active": not has_key
        }

    def test_connection(self) -> Dict[str, Any]:
        if not self.client:
            return {
                "success": False,
                "message": "GROQ_API_KEY is not configured or client failed to initialize.",
                "offline_mode": True
            }
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "user", "content": "Ping test for TESSERA AI Studio"}
                ],
                model="llama-3.1-8b-instant",
                max_completion_tokens=5
            )
            return {
                "success": True,
                "message": f"Successfully connected to Groq API. Response: {chat_completion.choices[0].message.content.strip()}",
                "model": "llama-3.1-8b-instant",
                "offline_mode": False
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Groq API connection test failed: {str(e)}",
                "offline_mode": True
            }

    def run_completion(
        self,
        prompt: str,
        system_instruction: str,
        model_profile: str = "Balanced",
        response_schema: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self.client or settings.DEMO_MODE:
            # Offline fallback handled by caller
            return {
                "is_live": False,
                "text": "",
                "tokens_used": 0,
                "model": "offline-synthetic-engine"
            }

        model = settings.GROQ_PRIMARY_MODEL
        if model_profile == "Economy":
            model = "llama-3.1-8b-instant"
        elif model_profile == "Thorough":
            model = settings.GROQ_COMPLEX_MODEL

        try:
            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ]
            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": 0.1,
                "max_completion_tokens": 4096
            }
            if response_schema:
                kwargs["response_format"] = {
                    "type": "json_object"
                }

            completion = self.client.chat.completions.create(**kwargs)
            text_content = completion.choices[0].message.content
            tokens = getattr(completion.usage, "total_tokens", 0) if completion.usage else 0

            return {
                "is_live": True,
                "text": text_content,
                "tokens_used": tokens,
                "model": model
            }
        except Exception as e:
            return {
                "is_live": False,
                "error": str(e),
                "text": "",
                "tokens_used": 0,
                "model": model
            }

groq_service = GroqService()
