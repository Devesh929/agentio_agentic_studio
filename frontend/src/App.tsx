import React, { useState, useEffect } from 'react'
import { Shell } from './components/layout/Shell'
import { OverviewPage } from './pages/OverviewPage'
import { SourcesPage } from './pages/SourcesPage'
import { GeneratePage } from './pages/GeneratePage'
import { RequirementsPage } from './pages/RequirementsPage'
import { SavedConfigurationsPage } from './pages/SavedConfigurationsPage'
import { QuestionsPage } from './pages/QuestionsPage'
import { ValidationPage } from './pages/ValidationPage'
import { SettingsPage } from './pages/SettingsPage'
import { Project } from './types'
import { api } from './api/client'

export function App() {
  const [currentTab, setCurrentTab] = useState('generate')
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [openQuestionsCount, setOpenQuestionsCount] = useState(0)
  const [conflictsCount, setConflictsCount] = useState(0)

  const refreshProjects = async () => {
    try {
      const list = await api.getProjects()
      setProjects(list)
      if (list.length > 0) {
        if (!activeProject || !list.find((p) => p.id === activeProject.id)) {
          setActiveProject(list[0])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadProjectStats = async (projectId: string) => {
    try {
      const qList = await api.getQuestions(projectId)
      setOpenQuestionsCount(qList.filter((q) => q.status === 'open').length)

      const reqList = await api.getRequirements(projectId)
      setConflictsCount(reqList.filter((r) => r.requirement.has_conflict).length)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    refreshProjects()
  }, [])

  useEffect(() => {
    if (activeProject) {
      loadProjectStats(activeProject.id)
    }
  }, [activeProject?.id, currentTab])

  return (
    <Shell
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      activeProject={activeProject}
      setActiveProject={setActiveProject}
      projects={projects}
      refreshProjects={refreshProjects}
      openQuestionsCount={openQuestionsCount}
      conflictsCount={conflictsCount}
    >
      {currentTab === 'overview' && (
        <OverviewPage
          activeProject={activeProject}
          setActiveProject={setActiveProject}
          refreshProjects={refreshProjects}
          setCurrentTab={setCurrentTab}
        />
      )}
      {currentTab === 'sources' && <SourcesPage activeProject={activeProject} />}
      {currentTab === 'generate' && (
        <GeneratePage activeProject={activeProject} setCurrentTab={setCurrentTab} />
      )}
      {currentTab === 'requirements' && (
        <RequirementsPage activeProject={activeProject} setCurrentTab={setCurrentTab} />
      )}
      {currentTab === 'saved-configurations' && (
        <SavedConfigurationsPage activeProject={activeProject} />
      )}
      {currentTab === 'questions' && (
        <QuestionsPage activeProject={activeProject} setCurrentTab={setCurrentTab} />
      )}
      {currentTab === 'validation' && <ValidationPage activeProject={activeProject} />}
      {currentTab === 'settings' && <SettingsPage />}
    </Shell>
  )
}

export default App
