/**
 * Spec Storage Service
 * Manages structured specifications separate from document-based knowledge
 */

export interface Spec {
  id: string;
  category: 'api' | 'business' | 'architecture' | 'workflow' | 'constraints' | 'goals';
  type: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'deprecated';
  immutable: boolean;
  fields: SpecField[];
  parentSpecId?: string; // For inheritance
  inheritedFields?: string[]; // Track which fields are inherited
  relatedSpecs?: string[]; // Related spec IDs
  history?: SpecHistoryEntry[]; // Version history
  projectId: string; // Associate with a project
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    tags: string[];
  };
  values: Record<string, any>;
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
  category: Spec['category'];
  description: string;
  fields: SpecField[];
}

// Predefined templates for common spec types
const specTemplates: SpecTemplate[] = [
  {
    id: 'api-contract',
    name: 'API Contract',
    category: 'api',
    description: 'Define API endpoints, methods, and response formats',
    fields: [
      {
        id: 'endpoint',
        name: 'Endpoint',
        type: 'text',
        required: true,
        placeholder: '/api/v1/resource',
        validation: { pattern: '^/.*' }
      },
      {
        id: 'method',
        name: 'HTTP Method',
        type: 'select',
        required: true,
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      },
      {
        id: 'request-schema',
        name: 'Request Schema',
        type: 'json',
        required: false,
        placeholder: '{ "name": "string", "age": "number" }'
      },
      {
        id: 'response-schema',
        name: 'Response Schema',
        type: 'json',
        required: true,
        placeholder: '{ "id": "string", "data": {} }'
      },
      {
        id: 'auth-required',
        name: 'Authentication Required',
        type: 'boolean',
        required: true,
        defaultValue: true
      }
    ]
  },
  {
    id: 'business-rule',
    name: 'Business Rule',
    category: 'business',
    description: 'Define business logic and constraints',
    fields: [
      {
        id: 'rule-name',
        name: 'Rule Name',
        type: 'text',
        required: true,
        placeholder: 'User Registration Validation'
      },
      {
        id: 'condition',
        name: 'Condition',
        type: 'code',
        required: true,
        placeholder: 'if (user.age < 18) { return false; }'
      },
      {
        id: 'action',
        name: 'Action',
        type: 'text',
        required: true,
        placeholder: 'Reject registration with error message'
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'number',
        required: true,
        defaultValue: 1,
        validation: { min: 1, max: 10 }
      }
    ]
  },
  {
    id: 'architecture-decision',
    name: 'Architecture Decision Record (ADR)',
    category: 'architecture',
    description: 'Document architectural decisions and their rationale',
    fields: [
      {
        id: 'title',
        name: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Use React for Frontend Framework'
      },
      {
        id: 'status',
        name: 'Status',
        type: 'select',
        required: true,
        options: ['proposed', 'accepted', 'deprecated', 'superseded'],
        defaultValue: 'proposed'
      },
      {
        id: 'context',
        name: 'Context',
        type: 'markdown',
        required: true,
        placeholder: 'What is the issue that we\'re seeing that is motivating this decision?'
      },
      {
        id: 'decision',
        name: 'Decision',
        type: 'markdown',
        required: true,
        placeholder: 'What is the change that we\'re proposing and/or doing?'
      },
      {
        id: 'consequences',
        name: 'Consequences',
        type: 'markdown',
        required: true,
        placeholder: 'What becomes easier or more difficult to do because of this change?'
      }
    ]
  },
  {
    id: 'project-goals',
    name: 'Project Goals',
    category: 'goals',
    description: 'Define project objectives and success criteria',
    fields: [
      {
        id: 'goal-name',
        name: 'Goal Name',
        type: 'text',
        required: true,
        placeholder: 'Improve User Engagement'
      },
      {
        id: 'description',
        name: 'Description',
        type: 'markdown',
        required: true,
        placeholder: 'Detailed description of what this goal means'
      },
      {
        id: 'success-criteria',
        name: 'Success Criteria',
        type: 'multiselect',
        required: true,
        options: ['User Metrics', 'Performance', 'Revenue', 'Quality', 'Adoption']
      },
      {
        id: 'target-date',
        name: 'Target Date',
        type: 'text',
        required: false,
        placeholder: 'Q2 2025'
      },
      {
        id: 'measurable-outcomes',
        name: 'Measurable Outcomes',
        type: 'markdown',
        required: true,
        placeholder: '- 20% increase in daily active users\n- 15% reduction in bounce rate'
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

  async getSpecsByCategory(category: Spec['category']): Promise<Spec[]> {
    const allSpecs = await this.getAllSpecs();
    return allSpecs.filter(spec => spec.category === category);
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

    let fields = spec.fields;
    let values = spec.values;
    let inheritedFields: string[] = [];

    // Handle inheritance
    if (spec.parentSpecId) {
      const parentSpec = await this.getSpec(spec.parentSpecId);
      if (parentSpec) {
        // Merge parent fields with child fields
        const childFieldIds = fields.map(f => f.id);
        const parentFieldsToInherit = parentSpec.fields.filter(f => !childFieldIds.includes(f.id));
        fields = [...parentFieldsToInherit, ...fields];
        
        // Inherit parent values for inherited fields
        parentFieldsToInherit.forEach(field => {
          if (!(field.id in values) && field.id in parentSpec.values) {
            values[field.id] = parentSpec.values[field.id];
            inheritedFields.push(field.id);
          }
        });
      }
    }

    const newSpec: Spec = {
      ...spec,
      fields,
      values,
      projectId,
      inheritedFields: inheritedFields.length > 0 ? inheritedFields : undefined,
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