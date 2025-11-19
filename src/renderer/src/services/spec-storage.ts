/**
 * Spec Storage Service
 * Manages structured specifications as form-like documents with sections
 */

export interface SpecSection {
  id: string;
  name: string;
  description?: string;
  fields: SpecField[];
  isBase: boolean; // true for Overview, Requirements, Constraints, Notes
  order: number;
}

export interface Spec {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'deprecated';
  immutable: boolean;
  sections: SpecSection[]; // Form sections instead of flat fields
  parentSpecId?: string; // For inheritance
  inheritedSections?: string[]; // Track which sections are inherited
  relatedSpecs?: string[]; // Related spec IDs
  history?: SpecHistoryEntry[]; // Version history
  projectId: string; // Associate with a project
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    tags: string[];
  };
  values: Record<string, any>; // Flat values keyed by field IDs
}

export interface SpecHistoryEntry {
  version: string;
  timestamp: Date;
  author: string;
  changes: Record<string, { old: any; new: any }>;
  comment?: string;
}

export interface SpecField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'code' | 'json' | 'markdown';
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[]; // For select/multiselect
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  defaultValue?: any;
}

export interface SpecTemplate {
  id: string;
  name: string;
  description: string;
  sections: SpecSection[]; // Includes base sections + template-specific sections
}

// Base sections that every spec has
export function getBaseSections(): SpecSection[] {
  return [
    {
      id: 'overview',
      name: 'Overview',
      description: 'What this specification defines',
      isBase: true,
      order: 0,
      fields: [
        {
          id: 'overview-summary',
          name: 'Summary',
          type: 'markdown',
          required: true,
          placeholder: 'Brief overview of what this spec defines...'
        }
      ]
    },
    {
      id: 'requirements',
      name: 'Requirements',
      description: 'What must be true',
      isBase: true,
      order: 1,
      fields: [
        {
          id: 'requirements-list',
          name: 'Requirements',
          type: 'markdown',
          required: false,
          placeholder: '- Requirement 1\n- Requirement 2\n- Requirement 3'
        }
      ]
    },
    {
      id: 'constraints',
      name: 'Constraints',
      description: 'What cannot or should not happen',
      isBase: true,
      order: 2,
      fields: [
        {
          id: 'constraints-list',
          name: 'Constraints',
          type: 'markdown',
          required: false,
          placeholder: '- Constraint 1\n- Constraint 2'
        }
      ]
    },
    {
      id: 'notes',
      name: 'Notes',
      description: 'Additional context and information',
      isBase: true,
      order: 3,
      fields: [
        {
          id: 'notes-content',
          name: 'Notes',
          type: 'markdown',
          required: false,
          placeholder: 'Any additional notes or context...'
        }
      ]
    }
  ];
}

// Predefined templates for common spec types
const specTemplates: SpecTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Spec',
    description: 'Start with just the base sections',
    sections: getBaseSections()
  },
  {
    id: 'api-contract',
    name: 'API Contract',
    description: 'Define API endpoints, methods, and response formats',
    sections: [
      ...getBaseSections(),
      {
        id: 'api-endpoints',
        name: 'API Endpoints',
        description: 'Define the endpoints for this API',
        isBase: false,
        order: 4,
        fields: [
          {
            id: 'endpoints',
            name: 'Endpoints',
            type: 'markdown',
            required: false,
            placeholder: '## POST /api/users\nCreate a new user...\n\n## GET /api/users/:id\nFetch user details...'
          },
          {
            id: 'authentication',
            name: 'Authentication',
            type: 'markdown',
            required: false,
            placeholder: 'Describe authentication requirements...'
          }
        ]
      }
    ]
  },
  {
    id: 'data-model',
    name: 'Data Model',
    description: 'Define data structures and relationships',
    sections: [
      ...getBaseSections(),
      {
        id: 'schema',
        name: 'Schema',
        description: 'Database schema and structure',
        isBase: false,
        order: 4,
        fields: [
          {
            id: 'schema-definition',
            name: 'Schema Definition',
            type: 'json',
            required: false,
            placeholder: '{\n  "users": {\n    "id": "uuid",\n    "email": "string",\n    "createdAt": "timestamp"\n  }\n}'
          },
          {
            id: 'relationships',
            name: 'Relationships',
            type: 'markdown',
            required: false,
            placeholder: '- User has many Posts\n- Post belongs to User'
          }
        ]
      }
    ]
  },
  {
    id: 'feature-spec',
    name: 'Feature Specification',
    description: 'Define a new feature or functionality',
    sections: [
      ...getBaseSections(),
      {
        id: 'user-stories',
        name: 'User Stories',
        description: 'User stories and acceptance criteria',
        isBase: false,
        order: 4,
        fields: [
          {
            id: 'stories',
            name: 'Stories',
            type: 'markdown',
            required: false,
            placeholder: 'As a [user type], I want to [action] so that [benefit]...'
          },
          {
            id: 'acceptance-criteria',
            name: 'Acceptance Criteria',
            type: 'markdown',
            required: false,
            placeholder: '- [ ] Criterion 1\n- [ ] Criterion 2\n- [ ] Criterion 3'
          }
        ]
      }
    ]
  }
];

class SpecStorage {
  private readonly STORAGE_KEY = 'guru_specs';

  async getAllSpecs(): Promise<Spec[]> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    const specs = JSON.parse(stored);
    return specs.map((spec: any) => ({
      ...spec,
      metadata: {
        ...spec.metadata,
        createdAt: new Date(spec.metadata.createdAt),
        updatedAt: new Date(spec.metadata.updatedAt)
      }
    }));
  }

  async getSpec(id: string): Promise<Spec | null> {
    const allSpecs = await this.getAllSpecs();
    return allSpecs.find(spec => spec.id === id) || null;
  }

  async createSpec(spec: Omit<Spec, 'id' | 'metadata'>): Promise<Spec> {
    // Get current project ID if not provided
    let projectId = spec.projectId;
    if (!projectId) {
      const { projectStorage } = await import('./project-storage');
      const currentProject = await projectStorage.getCurrentProject();
      if (!currentProject) {
        throw new Error('No project selected');
      }
      projectId = currentProject.id;
    }

    let sections = spec.sections;
    let values = spec.values;
    let inheritedSections: string[] = [];

    // Handle inheritance
    if (spec.parentSpecId) {
      const parentSpec = await this.getSpec(spec.parentSpecId);
      if (parentSpec) {
        // Merge parent sections with child sections
        const childSectionIds = sections.map(s => s.id);
        const parentSectionsToInherit = parentSpec.sections.filter(s => !childSectionIds.includes(s.id));
        sections = [...parentSectionsToInherit, ...sections];

        // Inherit parent values for inherited sections
        parentSectionsToInherit.forEach(section => {
          section.fields.forEach(field => {
            if (!(field.id in values) && field.id in parentSpec.values) {
              values[field.id] = parentSpec.values[field.id];
            }
          });
          inheritedSections.push(section.id);
        });
      }
    }

    const newSpec: Spec = {
      ...spec,
      sections,
      values,
      projectId,
      inheritedSections: inheritedSections.length > 0 ? inheritedSections : undefined,
      id: `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      history: [{
        version: spec.version,
        timestamp: new Date(),
        author: 'User',
        changes: {},
        comment: 'Initial creation'
      }],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'User', // TODO: Get from auth context
        tags: []
      }
    };

    const allSpecs = await this.getAllSpecs();
    allSpecs.push(newSpec);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allSpecs));

    // Update project metadata
    const { projectStorage } = await import('./project-storage');
    await projectStorage.updateProjectMetadata(projectId);

    // Index spec for AI
    try {
      // @ts-ignore
      if (window.api && window.api.spec) {
        // @ts-ignore
        await window.api.spec.index(newSpec);
      }
    } catch (error) {
      console.error('Failed to index spec:', error);
    }

    return newSpec;
  }

  async updateSpec(id: string, updates: Partial<Spec>): Promise<Spec | null> {
    const allSpecs = await this.getAllSpecs();
    const index = allSpecs.findIndex(spec => spec.id === id);

    if (index === -1) return null;

    const currentSpec = allSpecs[index];

    // Check if spec is immutable
    if (currentSpec.immutable) {
      throw new Error('Cannot update immutable spec');
    }

    // Track changes for history
    const changes: Record<string, { old: any; new: any }> = {};
    if (updates.values) {
      Object.keys(updates.values).forEach(key => {
        if (currentSpec.values[key] !== updates.values![key]) {
          changes[key] = {
            old: currentSpec.values[key],
            new: updates.values![key]
          };
        }
      });
    }

    // Add history entry if there are changes
    const history = currentSpec.history || [];
    if (Object.keys(changes).length > 0) {
      history.push({
        version: currentSpec.version,
        timestamp: new Date(),
        author: 'User',
        changes,
        comment: updates.metadata?.tags?.includes('auto-save') ? 'Auto-saved' : undefined
      });
    }

    const updatedSpec = {
      ...currentSpec,
      ...updates,
      history,
      metadata: {
        ...currentSpec.metadata,
        updatedAt: new Date()
      }
    };

    allSpecs[index] = updatedSpec;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allSpecs));

    // Index spec for AI
    try {
      // @ts-ignore
      if (window.api && window.api.spec) {
        // @ts-ignore
        await window.api.spec.index(updatedSpec);
      }
    } catch (error) {
      console.error('Failed to index spec:', error);
    }

    return updatedSpec;
  }

  async deleteSpec(id: string): Promise<void> {
    const allSpecs = await this.getAllSpecs();
    const spec = allSpecs.find(s => s.id === id);

    if (spec?.immutable) {
      throw new Error('Cannot delete immutable spec');
    }

    const filtered = allSpecs.filter(spec => spec.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  async makeSpecImmutable(id: string): Promise<void> {
    const allSpecs = await this.getAllSpecs();
    const index = allSpecs.findIndex(spec => spec.id === id);

    if (index !== -1) {
      allSpecs[index].immutable = true;
      allSpecs[index].metadata.updatedAt = new Date();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allSpecs));
    }
  }

  getTemplates(): SpecTemplate[] {
    return specTemplates;
  }

  getTemplate(id: string): SpecTemplate | undefined {
    return specTemplates.find(template => template.id === id);
  }

  async getChildSpecs(parentSpecId: string): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs();
    return allSpecs.filter(spec => spec.parentSpecId === parentSpecId);
  }

  async addRelatedSpec(specId: string, relatedSpecId: string): Promise<void> {
    const spec = await this.getSpec(specId);
    if (!spec) return;

    const relatedSpecs = spec.relatedSpecs || [];
    if (!relatedSpecs.includes(relatedSpecId)) {
      relatedSpecs.push(relatedSpecId);
      await this.updateSpec(specId, { relatedSpecs });
    }

    // Also add reverse relationship
    const relatedSpec = await this.getSpec(relatedSpecId);
    if (relatedSpec) {
      const reverseRelated = relatedSpec.relatedSpecs || [];
      if (!reverseRelated.includes(specId)) {
        reverseRelated.push(specId);
        await this.updateSpec(relatedSpecId, { relatedSpecs: reverseRelated });
      }
    }
  }

  async getSpecHistory(specId: string): Promise<SpecHistoryEntry[]> {
    const spec = await this.getSpec(specId);
    return spec?.history || [];
  }

  async getSpecsByProject(projectId: string): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs();
    return allSpecs.filter(spec => spec.projectId === projectId);
  }

  async deleteSpecsByProject(projectId: string): Promise<void> {
    const allSpecs = await this.getAllSpecs();
    const filtered = allSpecs.filter(spec => spec.projectId !== projectId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  async migrateSpecsToProjects(): Promise<void> {
    const allSpecs = await this.getAllSpecs();
    const { projectStorage } = await import('./project-storage');

    // Get default project
    const defaultProject = await projectStorage.getDefaultProject();
    if (!defaultProject) {
      throw new Error('No default project found');
    }

    // Update specs without projectId
    let updated = false;
    for (const spec of allSpecs) {
      if (!spec.projectId) {
        spec.projectId = defaultProject.id;
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allSpecs));
    }
  }
}

export const specStorage = new SpecStorage();