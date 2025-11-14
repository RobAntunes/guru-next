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
import {
  Plus,
  FileText,
  GitBranch,
  Database,
  Settings,
  Target,
  Shield,
  Edit,
  Save,
  X,
  Lock,
  Unlock,
  Code,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { specStorage, Spec, SpecField, SpecTemplate } from '../services/spec-storage';
import { projectStorage, Project } from '../services/project-storage';

interface SpecManagementProps {
  onSpecToggle?: (specId: string, enabled: boolean) => void;
}

export const SpecManagement: React.FC<SpecManagementProps> = ({ onSpecToggle }) => {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<Spec | null>(null);
  const [editingSpec, setEditingSpec] = useState<Spec | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SpecTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<Spec['category']>('api');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    loadCurrentProject();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadSpecs();
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

  const loadSpecs = async () => {
    if (!currentProject) return;
    
    const loadedSpecs = await specStorage.getSpecsByProject(currentProject.id);
    setSpecs(loadedSpecs);
  };

  const getCategoryIcon = (category: Spec['category']) => {
    switch (category) {
      case 'api': return <Database className="h-4 w-4" />;
      case 'business': return <Shield className="h-4 w-4" />;
      case 'architecture': return <GitBranch className="h-4 w-4" />;
      case 'workflow': return <Settings className="h-4 w-4" />;
      case 'constraints': return <AlertCircle className="h-4 w-4" />;
      case 'goals': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleCreateSpec = async () => {
    if (!selectedTemplate) return;

    const newSpec = await specStorage.createSpec({
      category: selectedTemplate.category,
      type: selectedTemplate.id,
      name: formValues.name || 'New ' + selectedTemplate.name,
      description: formValues.description || selectedTemplate.description,
      version: '1.0.0',
      status: 'draft',
      immutable: false,
      fields: selectedTemplate.fields,
      values: formValues
    });

    setSpecs([...specs, newSpec]);
    setShowCreateDialog(false);
    setSelectedTemplate(null);
    setFormValues({});
  };

  const handleUpdateSpec = async () => {
    if (!editingSpec) return;

    try {
      const updated = await specStorage.updateSpec(editingSpec.id, {
        values: formValues
      });

      if (updated) {
        setSpecs(specs.map(s => s.id === updated.id ? updated : s));
        setSelectedSpec(updated);
        setEditingSpec(null);
      }
    } catch (error) {
      console.error('Failed to update spec:', error);
    }
  };

  const handleMakeImmutable = async (specId: string) => {
    await specStorage.makeSpecImmutable(specId);
    await loadSpecs();
  };

  const renderFieldInput = (field: SpecField) => {
    const value = formValues[field.id] || field.defaultValue || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormValues({ ...formValues, [field.id]: parseFloat(e.target.value) })}
            min={field.validation?.min}
            max={field.validation?.max}
            required={field.required}
          />
        );

      case 'boolean':
        return (
          <Switch
            checked={value}
            onCheckedChange={(checked) => setFormValues({ ...formValues, [field.id]: checked })}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => setFormValues({ ...formValues, [field.id]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(value as string[])?.includes(option) || false}
                  onChange={(e) => {
                    const current = (formValues[field.id] || []) as string[];
                    if (e.target.checked) {
                      setFormValues({ ...formValues, [field.id]: [...current, option] });
                    } else {
                      setFormValues({ ...formValues, [field.id]: current.filter(v => v !== option) });
                    }
                  }}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'code':
      case 'json':
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
            className="font-mono text-xs"
            rows={6}
          />
        );

      case 'markdown':
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormValues({ ...formValues, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
          />
        );

      default:
        return null;
    }
  };

  const specsInCategory = specs.filter(spec => spec.category === activeCategory);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Core Specifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Structured knowledge that defines system behavior and constraints
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Spec
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)}>
        <TabsList className="grid w-full grid-cols-6 gap-1">
          <TabsTrigger value="api" className="data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800">APIs</TabsTrigger>
          <TabsTrigger value="business" className="data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800">Business</TabsTrigger>
          <TabsTrigger value="architecture" className="data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800">Architecture</TabsTrigger>
          <TabsTrigger value="workflow" className="data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800">Workflow</TabsTrigger>
          <TabsTrigger value="constraints" className="data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800">Constraints</TabsTrigger>
          <TabsTrigger value="goals" className="data-[state=active]:!bg-background data-[state=inactive]:!bg-neutral-800">Goals</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Spec List */}
        <div className="w-1/3 overflow-y-auto space-y-2">
          {specsInCategory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                No specs in this category yet
              </CardContent>
            </Card>
          ) : (
            specsInCategory.map(spec => (
              <Card
                key={spec.id}
                className={`cursor-pointer transition-all ${
                  selectedSpec?.id === spec.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  setSelectedSpec(spec);
                  setEditingSpec(null);
                  setFormValues(spec.values);
                }}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getCategoryIcon(spec.category)}
                      <div>
                        <CardTitle className="text-sm font-normal flex items-center gap-2">
                          {spec.name}
                          {spec.immutable && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          v{spec.version} • {spec.status}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={spec.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {spec.status}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Spec Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedSpec ? (
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedSpec.name}
                      {selectedSpec.immutable && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription>{selectedSpec.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedSpec.immutable && !editingSpec && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSpec(selectedSpec)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {!selectedSpec.immutable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMakeImmutable(selectedSpec.id)}
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Lock
                      </Button>
                    )}
                    {editingSpec && (
                      <>
                        <Button
                          size="sm"
                          onClick={handleUpdateSpec}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSpec(null);
                            setFormValues(selectedSpec.values);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSpec.fields.map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                    {editingSpec ? (
                      renderFieldInput(field)
                    ) : (
                      <div className="p-2 bg-muted/50 rounded text-sm">
                        {field.type === 'boolean' 
                          ? (selectedSpec.values[field.id] ? 'Yes' : 'No')
                          : field.type === 'multiselect'
                          ? (selectedSpec.values[field.id] as string[])?.join(', ') || 'None'
                          : selectedSpec.values[field.id] || <span className="text-muted-foreground">Not set</span>
                        }
                      </div>
                    )}
                  </div>
                ))}

                {/* Metadata */}
                <div className="pt-4 border-t">
                  <h4 className="text-xs font-medium mb-2">Metadata</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Created: {new Date(selectedSpec.metadata.createdAt).toLocaleString()}</p>
                    <p>Updated: {new Date(selectedSpec.metadata.updatedAt).toLocaleString()}</p>
                    <p>Author: {selectedSpec.metadata.author}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Select a spec to view details
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
                <CardTitle>Create New Spec</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setSelectedTemplate(null);
                    setFormValues({});
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!selectedTemplate ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choose a template to get started:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {specStorage.getTemplates().map(template => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setFormValues({});
                        }}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-start gap-2">
                            {getCategoryIcon(template.category)}
                            <div>
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{selectedTemplate.name}</h4>
                    <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Spec Name */}
                    <div>
                      <Label>Spec Name</Label>
                      <Input
                        value={formValues.name || ''}
                        onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                        placeholder={`New ${selectedTemplate.name}`}
                      />
                    </div>

                    {/* Spec Description */}
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={formValues.description || ''}
                        onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                        placeholder="Describe what this spec defines..."
                        rows={2}
                      />
                    </div>

                    {/* Template Fields */}
                    {selectedTemplate.fields.map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label>
                          {field.name}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                        {renderFieldInput(field)}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      Back
                    </Button>
                    <Button onClick={handleCreateSpec}>
                      Create Spec
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};