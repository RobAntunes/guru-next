import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  FileText,
  Play,
  Edit,
  Save,
  X,
  Copy,
  History,
  Search,
  Code,
  Sparkles,
  Variable,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { promptStorage, PromptTemplate, PromptVariable, PromptExecution } from '../services/prompt-storage';
import { projectStorage, Project } from '../services/project-storage';
import { TokenCounter, InlineTokenCounter } from './ui/token-counter';

interface PromptManagementProps {
  onPromptExecute?: (prompt: string, variables: Record<string, any>) => void;
}

export const PromptManagement: React.FC<PromptManagementProps> = ({ onPromptExecute }) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PromptTemplate['category']>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [variableValues, setVariableValues] = useState<Record<string, any>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [resolvedPrompt, setResolvedPrompt] = useState('');
  const [executionHistory, setExecutionHistory] = useState<PromptExecution[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // New template form state
  const [newTemplate, setNewTemplate] = useState<Partial<PromptTemplate>>({
    name: '',
    description: '',
    category: 'general',
    tags: [],
    content: '',
    variables: [],
    version: '1.0.0',
    status: 'draft'
  });

  useEffect(() => {
    loadCurrentProject();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadTemplates();
      loadExecutionHistory();
    }
  }, [currentProject]);

  // Listen for project changes
  useEffect(() => {
    const handleProjectSwitch = () => {
      loadCurrentProject();
    };
    
    window.addEventListener('project-switched', handleProjectSwitch);
    return () => {
      window.removeEventListener('project-switched', handleProjectSwitch);
    };
  }, []);

  const loadCurrentProject = async () => {
    try {
      const project = await projectStorage.getCurrentProject();
      setCurrentProject(project);
    } catch (error) {
      console.error('Failed to load current project:', error);
    }
  };

  const loadTemplates = async () => {
    if (!currentProject) return;
    
    const loaded = await promptStorage.getTemplatesByProject(currentProject.id);
    setTemplates(loaded);
  };

  const loadExecutionHistory = async () => {
    const history = promptStorage.getExecutionHistory();
    setExecutionHistory(history.slice(-10).reverse());
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTemplates();
      return;
    }
    
    const results = await promptStorage.searchTemplates(searchQuery);
    // Filter results by current project
    const projectResults = currentProject ? results.filter(t => t.projectId === currentProject.id) : results;
    setTemplates(projectResults);
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditingTemplate(null);
    setShowHistory(false);
    
    // Initialize variable values with defaults
    const defaults: Record<string, any> = {};
    template.variables.forEach(v => {
      defaults[v.id] = v.defaultValue !== undefined ? v.defaultValue : '';
    });
    setVariableValues(defaults);
    updatePreview(template, defaults);
  };

  const updatePreview = (template: PromptTemplate, values: Record<string, any>) => {
    const resolved = promptStorage.resolveTemplate(template, values);
    setResolvedPrompt(resolved);
  };

  const handleVariableChange = (varId: string, value: any) => {
    const newValues = { ...variableValues, [varId]: value };
    setVariableValues(newValues);
    if (selectedTemplate) {
      updatePreview(selectedTemplate, newValues);
    }
  };

  const handleExecutePrompt = async () => {
    if (!selectedTemplate || !resolvedPrompt) return;
    
    const execution: Omit<PromptExecution, 'id'> = {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      timestamp: new Date(),
      variables: variableValues,
      resolvedPrompt,
      success: true
    };
    
    await promptStorage.recordExecution(execution);
    
    if (onPromptExecute) {
      onPromptExecute(resolvedPrompt, variableValues);
    }
    
    loadExecutionHistory();
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    
    const created = await promptStorage.createTemplate({
      name: newTemplate.name,
      description: newTemplate.description || '',
      category: newTemplate.category || 'general',
      tags: newTemplate.tags || [],
      content: newTemplate.content,
      variables: newTemplate.variables || [],
      version: '1.0.0',
      status: 'draft'
    });
    
    setTemplates([...templates, created]);
    setShowCreateDialog(false);
    setNewTemplate({
      name: '',
      description: '',
      category: 'general',
      tags: [],
      content: '',
      variables: [],
      version: '1.0.0',
      status: 'draft'
    });
    setSelectedTemplate(created);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !selectedTemplate) return;
    
    const updated = await promptStorage.updateTemplate(selectedTemplate.id, {
      name: editingTemplate.name,
      description: editingTemplate.description,
      content: editingTemplate.content,
      variables: editingTemplate.variables,
      tags: editingTemplate.tags
    });
    
    if (updated) {
      setTemplates(templates.map(t => t.id === updated.id ? updated : t));
      setSelectedTemplate(updated);
      setEditingTemplate(null);
    }
  };

  const handleDuplicateTemplate = async (template: PromptTemplate) => {
    const duplicated = await promptStorage.duplicateTemplate(
      template.id,
      `${template.name} (Copy)`
    );
    
    if (duplicated) {
      setTemplates([...templates, duplicated]);
      setSelectedTemplate(duplicated);
    }
  };

  const renderVariableInput = (variable: PromptVariable) => {
    const value = variableValues[variable.id] || '';
    
    switch (variable.type) {
      case 'text':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleVariableChange(variable.id, e.target.value)}
            placeholder={variable.description}
            required={variable.required}
            rows={3}
            className="text-sm"
          />
        );
        
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleVariableChange(variable.id, val)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {variable.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-2">
            {variable.options?.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value as string[])?.includes(option) || false}
                  onChange={(e) => {
                    const current = (variableValues[variable.id] || []) as string[];
                    if (e.target.checked) {
                      handleVariableChange(variable.id, [...current, option]);
                    } else {
                      handleVariableChange(variable.id, current.filter(v => v !== option));
                    }
                  }}
                  className="rounded border-input"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );
        
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleVariableChange(variable.id, parseFloat(e.target.value))}
            min={variable.validation?.min}
            max={variable.validation?.max}
            required={variable.required}
            className="text-sm"
          />
        );
        
      case 'boolean':
        return (
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleVariableChange(variable.id, checked)}
          />
        );
        
      case 'json':
        return (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleVariableChange(variable.id, parsed);
              } catch {
                handleVariableChange(variable.id, e.target.value);
              }
            }}
            placeholder={variable.description || 'Enter valid JSON'}
            required={variable.required}
            className="font-mono text-xs"
            rows={5}
          />
        );
        
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: PromptTemplate['category']) => {
    switch (category) {
      case 'analysis': return <Search className="h-4 w-4" />;
      case 'generation': return <Sparkles className="h-4 w-4" />;
      case 'transformation': return <Code className="h-4 w-4" />;
      case 'synthesis': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredTemplates = templates.filter(t => 
    activeCategory === 'general' || t.category === activeCategory
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Prompt Templates</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Reusable prompts with variables for consistent AI interactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-7 pl-7 pr-2 w-[200px] text-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Template
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className='data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800'>General</TabsTrigger>
          <TabsTrigger value="analysis" className='data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800'>Analysis</TabsTrigger>
          <TabsTrigger value="generation" className='data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800'>Generation</TabsTrigger>
          <TabsTrigger value="transformation" className='data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800'>Transform</TabsTrigger>
          <TabsTrigger value="synthesis" className='data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800'>Synthesis</TabsTrigger>
          <TabsTrigger value="custom" className='data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800'>Custom</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Template List */}
        <div className="w-1/3 overflow-y-auto space-y-2">
          {filteredTemplates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                No templates in this category
              </CardContent>
            </Card>
          ) : (
            filteredTemplates.map(template => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getCategoryIcon(template.category)}
                      <div className="flex-1">
                        <CardTitle className="text-sm font-normal">{template.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Variable className="h-3 w-3" />
                            <span>{template.variables.length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>{template.metadata.usageCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={template.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {template.status}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Template Details */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {selectedTemplate ? (
            <>
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {selectedTemplate.name}
                        <Badge variant="outline" className="text-xs">
                          v{selectedTemplate.version}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{selectedTemplate.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {!editingTemplate && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTemplate({ ...selectedTemplate })}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicateTemplate(selectedTemplate)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowHistory(!showHistory)}
                          >
                            <History className="h-3 w-3 mr-1" />
                            History
                          </Button>
                        </>
                      )}
                      {editingTemplate && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleUpdateTemplate}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTemplate(null);
                              handleSelectTemplate(selectedTemplate);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <Tabs defaultValue="variables" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="variables">Variables</TabsTrigger>
                      <TabsTrigger value="template">Template</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="variables" className="flex-1 overflow-y-auto">
                      {editingTemplate ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              Edit mode - modify template content and variables
                            </p>
                            <TokenCounter text={editingTemplate.content} advanced={true} />
                          </div>
                          <Textarea
                            value={editingTemplate.content}
                            onChange={(e) => setEditingTemplate({
                              ...editingTemplate,
                              content: e.target.value
                            })}
                            className="font-mono text-xs"
                            rows={10}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedTemplate.variables.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              This template has no variables
                            </p>
                          ) : (
                            selectedTemplate.variables.map(variable => (
                              <div key={variable.id} className="space-y-2">
                                <Label className="text-sm font-medium">
                                  {variable.name}
                                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {variable.description && (
                                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                                )}
                                {renderVariableInput(variable)}
                              </div>
                            ))
                          )}
                          
                          <div className="pt-4 border-t">
                            <Button
                              onClick={handleExecutePrompt}
                              className="w-full"
                              disabled={!resolvedPrompt}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Execute Prompt
                            </Button>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="template" className="flex-1 overflow-y-auto">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Template Content</p>
                          <TokenCounter text={selectedTemplate.content} advanced={true} />
                        </div>
                        <div className="bg-muted/50 rounded-md p-4">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {selectedTemplate.content}
                          </pre>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 overflow-y-auto">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Resolved Prompt</p>
                          <TokenCounter text={resolvedPrompt} advanced={true} showCost={true} />
                        </div>
                        <div className="bg-muted/50 rounded-md p-4">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {resolvedPrompt || 'Fill in variables to see preview'}
                          </pre>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Execution History */}
              {showHistory && (
                <Card className="mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Executions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {executionHistory
                          .filter(e => e.templateId === selectedTemplate.id)
                          .map(execution => (
                            <div
                              key={execution.id}
                              className="p-2 bg-muted/50 rounded-md space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  {execution.success ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-3 w-3 text-red-600" />
                                  )}
                                  <span className="font-medium">
                                    {new Date(execution.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                {execution.duration && (
                                  <span className="text-muted-foreground">
                                    {execution.duration}ms
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Variables: {Object.keys(execution.variables).join(', ')}
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Select a template to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Template</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewTemplate({
                      name: '',
                      description: '',
                      category: 'general',
                      tags: [],
                      content: '',
                      variables: [],
                      version: '1.0.0',
                      status: 'draft'
                    });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={newTemplate.name || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="My Custom Template"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newTemplate.description || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Describe what this template does..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(val) => setNewTemplate({ ...newTemplate, category: val as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                    <SelectItem value="generation">Generation</SelectItem>
                    <SelectItem value="transformation">Transformation</SelectItem>
                    <SelectItem value="synthesis">Synthesis</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template Content</Label>
                <Textarea
                  value={newTemplate.content || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Enter your prompt template here. Use {{variableName}} for variables."
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};