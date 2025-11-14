/**
 * ProjectManagement - Manage projects and switch between them
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  FolderKanban,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Calendar,
  Folder
} from 'lucide-react'
import { projectStorage, Project } from '../services/project-storage'
import { analytics } from '../services/analytics'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    loadProjects()
    analytics.trackPageView('project_management')
  }, [])

  const loadProjects = async () => {
    try {
      const allProjects = await projectStorage.getAllProjects()
      const current = await projectStorage.getCurrentProject()
      setProjects(allProjects)
      setCurrentProject(current)
    } catch (error) {
      console.error('Failed to load projects:', error)
      analytics.trackError(error as Error, 'project_load')
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      await projectStorage.createProject(newProjectName, newProjectDescription)
      analytics.track('project_created', { name: newProjectName })
      setNewProjectName('')
      setNewProjectDescription('')
      setIsCreating(false)
      await loadProjects()
    } catch (error) {
      console.error('Failed to create project:', error)
      analytics.trackError(error as Error, 'project_create')
    }
  }

  const handleSwitchProject = async (projectId: string) => {
    try {
      await projectStorage.switchProject(projectId)
      analytics.track('project_switched', { projectId })
      await loadProjects()
    } catch (error) {
      console.error('Failed to switch project:', error)
      analytics.trackError(error as Error, 'project_switch')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await projectStorage.deleteProject(projectId)
      analytics.track('project_deleted', { projectId })
      await loadProjects()
    } catch (error) {
      console.error('Failed to delete project:', error)
      analytics.trackError(error as Error, 'project_delete')
    }
  }

  const handleStartEdit = (project: Project) => {
    setEditingId(project.id)
    setEditName(project.name)
    setEditDescription(project.description || '')
  }

  const handleSaveEdit = async (projectId: string) => {
    try {
      await projectStorage.updateProject(projectId, {
        name: editName,
        description: editDescription
      })
      analytics.track('project_updated', { projectId })
      setEditingId(null)
      await loadProjects()
    } catch (error) {
      console.error('Failed to update project:', error)
      analytics.trackError(error as Error, 'project_update')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
              <FolderKanban className="h-8 w-8" />
              Project Management
            </h2>
            <p className="text-muted-foreground mt-1">Organize your work into separate projects</p>
          </div>

          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2" variant="outline">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Projects help you organize different contexts and knowledge bases
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="My Project"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-description">Description (optional)</Label>
                  <Input
                    id="project-description"
                    placeholder="What is this project about?"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Project */}
        {currentProject && (
          <Card className="border-2 border-primary/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    Current Project
                  </CardTitle>
                  <CardDescription>You are currently working in this project</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{currentProject.name}</h3>
                  {currentProject.description && (
                    <p className="text-sm text-muted-foreground">{currentProject.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(currentProject.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Folder className="h-3 w-3" />
                      Last used {new Date(currentProject.lastAccessedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Projects */}
        <div>
          <h3 className="text-lg font-semibold mb-4">All Projects ({projects.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`
                  transition-all hover:shadow-md
                  ${project.id === currentProject?.id ? 'opacity-60' : 'cursor-pointer'}
                `}
              >
                <CardContent className="pt-6">
                  {editingId === project.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Project name"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(project.id)}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-lg">{project.name}</h4>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {project.id !== currentProject?.id && (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchProject(project.id)}
                            className="flex-1"
                          >
                            Switch to this project
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(project)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={project.id === currentProject?.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {projects.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first project to get started
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
