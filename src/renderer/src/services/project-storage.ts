/**
 * Project Storage Service
 * Manages projects as top-level containers for all user content
 */

import { BaseDirectory, readTextFile, writeTextFile, exists } from './browser-storage';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string; // For visual identification
  icon?: string; // Optional emoji or icon identifier
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  settings?: {
    defaultKnowledgeBaseId?: string;
    defaultView?: 'resources' | 'specs' | 'prompts';
    theme?: 'light' | 'dark' | 'system';
  };
  metadata?: {
    knowledgeBaseCount: number;
    documentCount: number;
    specCount: number;
    promptCount: number;
  };
}

class ProjectStorageService {
  private readonly PROJECTS_FILE = 'projects/projects.json';
  private readonly CURRENT_PROJECT_FILE = 'projects/current_project.json';

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    try {
      const fileExists = await exists(this.PROJECTS_FILE, { baseDir: BaseDirectory.AppData });
      if (!fileExists) {
        return [];
      }

      const content = await readTextFile(this.PROJECTS_FILE, { baseDir: BaseDirectory.AppData });
      const projects = JSON.parse(content);
      return projects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        lastAccessedAt: new Date(p.lastAccessedAt)
      }));
    } catch (error) {
      console.error('Failed to read projects:', error);
      return [];
    }
  }

  /**
   * Get current active project
   */
  async getCurrentProject(): Promise<Project | null> {
    try {
      const fileExists = await exists(this.CURRENT_PROJECT_FILE, { baseDir: BaseDirectory.AppData });
      let currentProjectId: string | null = null;

      if (fileExists) {
        const content = await readTextFile(this.CURRENT_PROJECT_FILE, { baseDir: BaseDirectory.AppData });
        const data = JSON.parse(content);
        currentProjectId = data.currentProjectId;
      }

      if (!currentProjectId) {
        // No current project set, try to get the first one
        const projects = await this.getAllProjects();
        if (projects.length > 0) {
          await this.setCurrentProject(projects[0].id);
          return projects[0];
        }
        // Create a default project if none exist
        const defaultProject = await this.createProject(
          'My Project',
          'Default project for organizing your knowledge'
        );
        // Set current project
        await writeTextFile(
          this.CURRENT_PROJECT_FILE,
          JSON.stringify({ currentProjectId: defaultProject.id }),
          { baseDir: BaseDirectory.AppData }
        );
        return defaultProject;
      }

      return this.getProject(currentProjectId);
    } catch (error) {
      console.error('Failed to get current project:', error);
      return null;
    }
  }

  /**
   * Set current active project
   */
  async setCurrentProject(projectId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Update last accessed time
    await this.updateProject(projectId, {
      lastAccessedAt: new Date()
    });

    await writeTextFile(
      this.CURRENT_PROJECT_FILE,
      JSON.stringify({ currentProjectId: projectId }),
      { baseDir: BaseDirectory.AppData }
    );
  }
  
  /**
   * Get specific project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getAllProjects();
    return projects.find(p => p.id === id) || null;
  }

  /**
   * Get default project (first project or create one if none exist)
   */
  async getDefaultProject(): Promise<Project | null> {
    const projects = await this.getAllProjects();
    if (projects.length === 0) {
      return null;
    }
    return projects[0];
  }
  
  /**
   * Create a new project
   */
  async createProject(name: string, description: string = ''): Promise<Project> {
    // Get existing projects
    const projects = await this.getAllProjects();

    // Generate a random color for the project
    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#8b5cf6', // violet
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newProject: Project = {
      id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      color: randomColor,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      settings: {
        defaultView: 'resources'
      },
      metadata: {
        knowledgeBaseCount: 0,
        documentCount: 0,
        specCount: 0,
        promptCount: 0
      }
    };

    projects.push(newProject);
    await writeTextFile(this.PROJECTS_FILE, JSON.stringify(projects, null, 2), {
      baseDir: BaseDirectory.AppData
    });

    // If this is the first project, set it as current
    if (projects.length === 1) {
      await writeTextFile(
        this.CURRENT_PROJECT_FILE,
        JSON.stringify({ currentProjectId: newProject.id }),
        { baseDir: BaseDirectory.AppData }
      );
    }

    return newProject;
  }

  /**
   * Update project details
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const projects = await this.getAllProjects();
    const index = projects.findIndex(p => p.id === id);

    if (index === -1) return null;

    const updated = {
      ...projects[index],
      ...updates,
      updatedAt: new Date()
    };

    projects[index] = updated;
    await writeTextFile(this.PROJECTS_FILE, JSON.stringify(projects, null, 2), {
      baseDir: BaseDirectory.AppData
    });

    return updated;
  }
  
  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    const projects = await this.getAllProjects();
    const filtered = projects.filter(p => p.id !== id);
    
    if (filtered.length === projects.length) {
      throw new Error(`Project not found: ${id}`);
    }
    
    // Don't allow deleting the last project
    if (filtered.length === 0) {
      throw new Error('Cannot delete the last project');
    }
    
    // Delete all related content
    const { knowledgeBaseStorage } = await import('./knowledge-base-storage');
    const { documentStorage } = await import('./document-storage');
    const { specStorage } = await import('./spec-storage');
    const { promptStorage } = await import('./prompt-storage');
    
    // Delete all knowledge bases for this project (this will cascade delete documents)
    await knowledgeBaseStorage.deleteKnowledgeBasesByProject(id);
    
    // Delete all documents for this project (in case some are orphaned)
    await documentStorage.deleteDocumentsByProject(id);
    
    // Delete all specs for this project
    await specStorage.deleteSpecsByProject(id);
    
    // Delete all prompts for this project
    await promptStorage.deleteTemplatesByProject(id);
    
    // Delete the project itself
    await writeTextFile(this.PROJECTS_FILE, JSON.stringify(filtered, null, 2), {
      baseDir: BaseDirectory.AppData
    });

    // If we deleted the current project, switch to another one
    const fileExists = await exists(this.CURRENT_PROJECT_FILE, { baseDir: BaseDirectory.AppData });
    if (fileExists) {
      const content = await readTextFile(this.CURRENT_PROJECT_FILE, { baseDir: BaseDirectory.AppData });
      const data = JSON.parse(content);
      if (data.currentProjectId === id) {
        await this.setCurrentProject(filtered[0].id);
      }
    }
  }
  
  /**
   * Update project metadata (counts)
   */
  async updateProjectMetadata(projectId: string): Promise<void> {
    // This will be called by other storage services when they add/remove items
    // For now, we'll implement basic counting later when we integrate with other services
    
    // TODO: Count knowledge bases, documents, specs, and prompts for this project
    const knowledgeBaseCount = 0; // Will be calculated from knowledge base storage
    const documentCount = 0; // Will be calculated from document storage
    const specCount = 0; // Will be calculated from spec storage
    const promptCount = 0; // Will be calculated from prompt storage
    
    await this.updateProject(projectId, {
      metadata: {
        knowledgeBaseCount,
        documentCount,
        specCount,
        promptCount
      }
    });
  }
  
  /**
   * Switch to a project
   */
  async switchToProject(projectId: string): Promise<void> {
    await this.setCurrentProject(projectId);
    
    // Emit an event so UI can react
    window.dispatchEvent(new CustomEvent('project-switched', { 
      detail: { projectId } 
    }));
  }
  
  /**
   * Duplicate a project (structure only, not content)
   */
  async duplicateProject(sourceProjectId: string, newName: string): Promise<Project> {
    const sourceProject = await this.getProject(sourceProjectId);
    if (!sourceProject) {
      throw new Error(`Source project not found: ${sourceProjectId}`);
    }
    
    const newProject = await this.createProject(
      newName,
      `Duplicated from ${sourceProject.name}`
    );
    
    // Copy settings but not metadata
    await this.updateProject(newProject.id, {
      settings: { ...sourceProject.settings },
      color: sourceProject.color,
      icon: sourceProject.icon
    });
    
    return newProject;
  }
  
  /**
   * Export project metadata (for backup/sharing)
   */
  async exportProject(projectId: string): Promise<string> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    // TODO: Include all related data (knowledge bases, documents, specs, prompts)
    const exportData = {
      project,
      knowledgeBases: [], // Will be filled from knowledge base storage
      documents: [], // Will be filled from document storage
      specs: [], // Will be filled from spec storage
      prompts: [], // Will be filled from prompt storage
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Import project from JSON
   */
  async importProject(jsonData: string): Promise<Project> {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate the data structure
      if (!data.project || !data.project.name) {
        throw new Error('Invalid project data');
      }
      
      // Create new project with imported data
      const newProject = await this.createProject(
        `${data.project.name} (Imported)`,
        data.project.description || 'Imported project'
      );
      
      // Update with imported settings
      await this.updateProject(newProject.id, {
        settings: data.project.settings || {},
        color: data.project.color || newProject.color,
        icon: data.project.icon
      });
      
      // TODO: Import all related data (knowledge bases, documents, specs, prompts)
      // This will need to coordinate with other storage services
      
      return newProject;
    } catch (error) {
      throw new Error(`Failed to import project: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const projectStorage = new ProjectStorageService();