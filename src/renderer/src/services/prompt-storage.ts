/**
 * Prompt Storage Service
 * Manages prompt templates with variables and version history
 */

export interface PromptVariable {
  id: string;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'json';
  description?: string;
  defaultValue?: any;
  required: boolean;
  options?: string[]; // For select/multiselect
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'analysis' | 'generation' | 'transformation' | 'synthesis' | 'custom';
  tags: string[];
  content: string; // Template with {{variable}} placeholders
  variables: PromptVariable[];
  version: string;
  status: 'draft' | 'active' | 'archived';
  projectId: string; // Associate with a project
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    usageCount: number;
    lastUsed?: Date;
    averageTokens?: number;
  };
  history?: PromptHistoryEntry[];
}

export interface PromptHistoryEntry {
  version: string;
  timestamp: Date;
  content: string;
  variables: PromptVariable[];
  changes: string;
  author: string;
}

export interface PromptExecution {
  id: string;
  templateId: string;
  templateName: string;
  timestamp: Date;
  variables: Record<string, any>;
  resolvedPrompt: string;
  tokenCount?: number;
  response?: string;
  duration?: number;
  success: boolean;
  error?: string;
}

// Predefined prompt templates (projectId will be added during initialization)
const defaultTemplates: Omit<PromptTemplate, 'id' | 'metadata' | 'history' | 'projectId'>[] = [
  {
    name: 'Code Analysis',
    description: 'Analyze code structure, patterns, and potential improvements',
    category: 'analysis',
    tags: ['code', 'review', 'analysis'],
    content: `Analyze the following {{language}} code:

\`\`\`{{language}}
{{code}}
\`\`\`

Focus on:
{{#if checkPatterns}}
- Design patterns and architectural decisions
{{/if}}
{{#if checkPerformance}}
- Performance implications and optimizations
{{/if}}
{{#if checkSecurity}}
- Security vulnerabilities and best practices
{{/if}}
{{#if checkMaintainability}}
- Code maintainability and readability
{{/if}}

Provide specific recommendations for improvement.`,
    variables: [
      {
        id: 'language',
        name: 'Programming Language',
        type: 'select',
        options: ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'c++'],
        required: true,
        defaultValue: 'typescript'
      },
      {
        id: 'code',
        name: 'Code to Analyze',
        type: 'text',
        required: true,
        description: 'Paste the code you want to analyze'
      },
      {
        id: 'checkPatterns',
        name: 'Check Design Patterns',
        type: 'boolean',
        required: false,
        defaultValue: true
      },
      {
        id: 'checkPerformance',
        name: 'Check Performance',
        type: 'boolean',
        required: false,
        defaultValue: true
      },
      {
        id: 'checkSecurity',
        name: 'Check Security',
        type: 'boolean',
        required: false,
        defaultValue: false
      },
      {
        id: 'checkMaintainability',
        name: 'Check Maintainability',
        type: 'boolean',
        required: false,
        defaultValue: true
      }
    ],
    version: '1.0.0',
    status: 'active'
  },
  {
    name: 'Document Synthesis',
    description: 'Synthesize insights from multiple documents',
    category: 'synthesis',
    tags: ['synthesis', 'documents', 'insights'],
    content: `Synthesize the following documents using the {{framework}} framework:

Documents:
{{documents}}

{{#if specificFocus}}
Specific Focus: {{focusArea}}
{{/if}}

Generate:
1. Key insights and patterns
2. Contradictions or gaps
3. Actionable recommendations
{{#if generateSummary}}
4. Executive summary (max {{summaryLength}} words)
{{/if}}

Format the output as structured markdown.`,
    variables: [
      {
        id: 'framework',
        name: 'Synthesis Framework',
        type: 'select',
        options: ['SCAMPER', 'Gap Analysis', 'SWOT', 'First Principles', 'Morphological'],
        required: true,
        defaultValue: 'Gap Analysis'
      },
      {
        id: 'documents',
        name: 'Documents to Synthesize',
        type: 'text',
        required: true,
        description: 'Content or references to synthesize'
      },
      {
        id: 'specificFocus',
        name: 'Has Specific Focus',
        type: 'boolean',
        required: false,
        defaultValue: false
      },
      {
        id: 'focusArea',
        name: 'Focus Area',
        type: 'text',
        required: false,
        description: 'Specific area to focus on'
      },
      {
        id: 'generateSummary',
        name: 'Generate Summary',
        type: 'boolean',
        required: false,
        defaultValue: true
      },
      {
        id: 'summaryLength',
        name: 'Summary Length (words)',
        type: 'number',
        required: false,
        defaultValue: 200,
        validation: { min: 50, max: 500 }
      }
    ],
    version: '1.0.0',
    status: 'active'
  },
  {
    name: 'API Documentation',
    description: 'Generate comprehensive API documentation',
    category: 'generation',
    tags: ['api', 'documentation', 'technical'],
    content: `Generate API documentation for the following endpoint:

Endpoint: {{method}} {{endpoint}}
{{#if description}}
Description: {{description}}
{{/if}}

Request:
{{#if requestBody}}
Body:
\`\`\`json
{{requestBody}}
\`\`\`
{{/if}}
{{#if queryParams}}
Query Parameters:
{{queryParams}}
{{/if}}
{{#if headers}}
Headers:
{{headers}}
{{/if}}

Response:
\`\`\`json
{{responseSchema}}
\`\`\`

Generate:
1. Overview and purpose
2. Authentication requirements
3. Request/response examples
4. Error codes and handling
5. Rate limiting information
{{#if includeCodeSamples}}
6. Code samples in: {{codeSampleLanguages}}
{{/if}}`,
    variables: [
      {
        id: 'method',
        name: 'HTTP Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        required: true
      },
      {
        id: 'endpoint',
        name: 'Endpoint Path',
        type: 'text',
        required: true,
        description: 'API endpoint path (e.g., /api/v1/users/{id})'
      },
      {
        id: 'description',
        name: 'Endpoint Description',
        type: 'text',
        required: false
      },
      {
        id: 'requestBody',
        name: 'Request Body Schema',
        type: 'json',
        required: false
      },
      {
        id: 'queryParams',
        name: 'Query Parameters',
        type: 'text',
        required: false
      },
      {
        id: 'headers',
        name: 'Required Headers',
        type: 'text',
        required: false
      },
      {
        id: 'responseSchema',
        name: 'Response Schema',
        type: 'json',
        required: true
      },
      {
        id: 'includeCodeSamples',
        name: 'Include Code Samples',
        type: 'boolean',
        required: false,
        defaultValue: true
      },
      {
        id: 'codeSampleLanguages',
        name: 'Code Sample Languages',
        type: 'multiselect',
        options: ['JavaScript', 'Python', 'Go', 'cURL', 'Java'],
        required: false,
        defaultValue: ['JavaScript', 'Python', 'cURL']
      }
    ],
    version: '1.0.0',
    status: 'active'
  },
  {
    name: 'Refactoring Assistant',
    description: 'Help refactor code with specific goals',
    category: 'transformation',
    tags: ['refactoring', 'code', 'improvement'],
    content: `Refactor the following code with these goals:

Original Code:
\`\`\`{{language}}
{{originalCode}}
\`\`\`

Refactoring Goals:
{{#each goals}}
- {{this}}
{{/each}}

{{#if constraints}}
Constraints:
{{constraints}}
{{/if}}

Provide:
1. Refactored code with comments explaining changes
2. List of specific improvements made
3. Any trade-offs or considerations
{{#if showBeforeAfter}}
4. Before/after comparison of key sections
{{/if}}`,
    variables: [
      {
        id: 'language',
        name: 'Programming Language',
        type: 'select',
        options: ['javascript', 'typescript', 'python', 'go', 'rust', 'java'],
        required: true
      },
      {
        id: 'originalCode',
        name: 'Original Code',
        type: 'text',
        required: true
      },
      {
        id: 'goals',
        name: 'Refactoring Goals',
        type: 'multiselect',
        options: [
          'Improve readability',
          'Enhance performance',
          'Reduce complexity',
          'Add type safety',
          'Extract reusable components',
          'Improve error handling',
          'Add tests',
          'Follow design patterns'
        ],
        required: true
      },
      {
        id: 'constraints',
        name: 'Constraints',
        type: 'text',
        required: false,
        description: 'Implementation constraints (e.g., maintain backward compatibility, no external dependencies)'
      },
      {
        id: 'showBeforeAfter',
        name: 'Show Before/After Comparison',
        type: 'boolean',
        required: false,
        defaultValue: true
      }
    ],
    version: '1.0.0',
    status: 'active'
  }
];

class PromptStorage {
  private readonly STORAGE_KEY = 'guru_prompts';
  private readonly HISTORY_KEY = 'guru_prompt_history';
  private readonly EXECUTION_KEY = 'guru_prompt_executions';

  async getAllTemplates(): Promise<PromptTemplate[]> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      // Initialize with default templates
      await this.initializeDefaults();
      return this.getAllTemplates();
    }
    
    const templates = JSON.parse(stored);
    return templates.map((template: any) => ({
      ...template,
      metadata: {
        ...template.metadata,
        createdAt: new Date(template.metadata.createdAt),
        updatedAt: new Date(template.metadata.updatedAt),
        lastUsed: template.metadata.lastUsed ? new Date(template.metadata.lastUsed) : undefined
      }
    }));
  }

  private async initializeDefaults(): Promise<void> {
    const { projectStorage } = await import('./project-storage');
    const currentProject = await projectStorage.getCurrentProject();
    
    if (!currentProject) {
      throw new Error('No project selected');
    }
    
    const templates = defaultTemplates.map(template => ({
      ...template,
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: currentProject.id,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'System',
        usageCount: 0
      }
    }));
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
  }

  async getTemplate(id: string): Promise<PromptTemplate | null> {
    const templates = await this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  async getTemplatesByCategory(category: PromptTemplate['category']): Promise<PromptTemplate[]> {
    const templates = await this.getAllTemplates();
    return templates.filter(t => t.category === category);
  }

  async searchTemplates(query: string): Promise<PromptTemplate[]> {
    const templates = await this.getAllTemplates();
    const lowerQuery = query.toLowerCase();
    
    return templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      t.content.toLowerCase().includes(lowerQuery)
    );
  }

  async createTemplate(template: Omit<PromptTemplate, 'id' | 'metadata' | 'history'>): Promise<PromptTemplate> {
    // Get current project ID if not provided
    let projectId = template.projectId;
    if (!projectId) {
      const { projectStorage } = await import('./project-storage');
      const currentProject = await projectStorage.getCurrentProject();
      if (!currentProject) {
        throw new Error('No project selected');
      }
      projectId = currentProject.id;
    }

    const newTemplate: PromptTemplate = {
      ...template,
      projectId,
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'User',
        usageCount: 0
      }
    };

    const templates = await this.getAllTemplates();
    templates.push(newTemplate);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));

    // Update project metadata
    const { projectStorage } = await import('./project-storage');
    await projectStorage.updateProjectMetadata(projectId);

    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate | null> {
    const templates = await this.getAllTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return null;
    
    const currentTemplate = templates[index];
    
    // Save to history if content or variables changed
    if (updates.content !== undefined || updates.variables !== undefined) {
      const history = currentTemplate.history || [];
      history.push({
        version: currentTemplate.version,
        timestamp: new Date(),
        content: currentTemplate.content,
        variables: currentTemplate.variables,
        changes: 'Updated template',
        author: 'User'
      });
      
      // Increment version
      const [major, minor, patch] = currentTemplate.version.split('.').map(Number);
      updates.version = `${major}.${minor}.${patch + 1}`;
      updates.history = history;
    }
    
    const updatedTemplate = {
      ...currentTemplate,
      ...updates,
      metadata: {
        ...currentTemplate.metadata,
        updatedAt: new Date()
      }
    };
    
    templates[index] = updatedTemplate;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getAllTemplates();
    const filtered = templates.filter(t => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  async duplicateTemplate(id: string, newName: string): Promise<PromptTemplate | null> {
    const template = await this.getTemplate(id);
    if (!template) return null;
    
    const duplicate = {
      ...template,
      name: newName,
      status: 'draft' as const,
      version: '1.0.0'
    };
    
    delete (duplicate as any).id;
    delete (duplicate as any).metadata;
    delete (duplicate as any).history;
    
    return this.createTemplate(duplicate);
  }

  resolveTemplate(template: PromptTemplate, variables: Record<string, any>): string {
    let resolved = template.content;
    
    // Simple variable replacement (can be enhanced with a proper template engine)
    Object.entries(variables).forEach(([key, value]) => {
      // Handle simple variables
      resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      
      // Handle conditionals (basic implementation)
      const ifRegex = new RegExp(`{{#if ${key}}}([\\s\\S]*?){{/if}}`, 'g');
      resolved = resolved.replace(ifRegex, (match, content) => {
        return value ? content : '';
      });
    });
    
    // Handle arrays/each (basic implementation)
    const eachRegex = /{{#each (\w+)}}([\s\S]*?){{\/each}}/g;
    resolved = resolved.replace(eachRegex, (match, varName, content) => {
      const array = variables[varName];
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        return content.replace(/{{this}}/g, String(item));
      }).join('');
    });
    
    // Clean up any remaining placeholders
    resolved = resolved.replace(/{{[^}]+}}/g, '');
    
    return resolved.trim();
  }

  async recordExecution(execution: Omit<PromptExecution, 'id'>): Promise<void> {
    const executions = this.getExecutionHistory();
    const newExecution: PromptExecution = {
      ...execution,
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    executions.push(newExecution);
    
    // Keep only last 100 executions
    if (executions.length > 100) {
      executions.splice(0, executions.length - 100);
    }
    
    localStorage.setItem(this.EXECUTION_KEY, JSON.stringify(executions));
    
    // Update template usage stats
    const template = await this.getTemplate(execution.templateId);
    if (template) {
      await this.updateTemplate(template.id, {
        metadata: {
          ...template.metadata,
          usageCount: template.metadata.usageCount + 1,
          lastUsed: new Date(),
          averageTokens: execution.tokenCount
        }
      });
    }
  }

  getExecutionHistory(): PromptExecution[] {
    const stored = localStorage.getItem(this.EXECUTION_KEY);
    if (!stored) return [];
    
    return JSON.parse(stored).map((exec: any) => ({
      ...exec,
      timestamp: new Date(exec.timestamp)
    }));
  }

  async getTemplateExecutions(templateId: string): Promise<PromptExecution[]> {
    return this.getExecutionHistory().filter(e => e.templateId === templateId);
  }

  async rollbackTemplate(templateId: string, version: string): Promise<PromptTemplate | null> {
    const template = await this.getTemplate(templateId);
    if (!template || !template.history) return null;
    
    const historyEntry = template.history.find(h => h.version === version);
    if (!historyEntry) return null;
    
    return this.updateTemplate(templateId, {
      content: historyEntry.content,
      variables: historyEntry.variables,
      version: historyEntry.version
    });
  }

  async getTemplatesByProject(projectId: string): Promise<PromptTemplate[]> {
    const allTemplates = await this.getAllTemplates();
    return allTemplates.filter(template => template.projectId === projectId);
  }

  async deleteTemplatesByProject(projectId: string): Promise<void> {
    const allTemplates = await this.getAllTemplates();
    const filtered = allTemplates.filter(template => template.projectId !== projectId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  async migrateTemplatesToProjects(): Promise<void> {
    const allTemplates = await this.getAllTemplates();
    const { projectStorage } = await import('./project-storage');
    
    // Get default project
    const defaultProject = await projectStorage.getDefaultProject();
    if (!defaultProject) {
      throw new Error('No default project found');
    }
    
    // Update templates without projectId
    let updated = false;
    for (const template of allTemplates) {
      if (!template.projectId) {
        template.projectId = defaultProject.id;
        updated = true;
      }
    }
    
    if (updated) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allTemplates));
    }
  }
}

export const promptStorage = new PromptStorage();