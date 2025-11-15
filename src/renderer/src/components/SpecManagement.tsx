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
  Edit,
  Save,
  X,
  Lock,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { specStorage, Spec, SpecField, SpecTemplate, SpecSection, getBaseSections } from '../services/spec-storage';
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
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCurrentProject();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadSpecs();
    }
  }, [currentProject]);

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

  const handleCreateSpec = async () => {
    if (!selectedTemplate) return;

    const newSpec = await specStorage.createSpec({
      name: formValues.name || 'New ' + selectedTemplate.name,
      description: formValues.description || selectedTemplate.description,
      version: '1.0.0',
      status: 'draft',
      immutable: false,
      sections: selectedTemplate.sections,
      values: formValues,
      projectId: currentProject!.id
    });

    setSpecs([...specs, newSpec]);
    setShowCreateDialog(false);
    setSelectedTemplate(null);
    setFormValues({});
    setSelectedSpec(newSpec);
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

  const handleDeleteSpec = async (specId: string) => {
    if (confirm('Are you sure you want to delete this spec?')) {
      await specStorage.deleteSpec(specId);
      setSpecs(specs.filter(s => s.id !== specId));
      if (selectedSpec?.id === specId) {
        setSelectedSpec(null);
      }
    }
  };

  const handleMakeImmutable = async (specId: string) => {
    await specStorage.makeSpecImmutable(specId);
    await loadSpecs();
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
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
            rows={8}
            className="font-mono text-sm"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Specifications</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Structured knowledge defining system behavior and constraints
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="h-7 text-xs"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          <Plus className="h-3 w-3 mr-1" />
          New Spec
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Spec List */}
        <div className="w-1/3 overflow-y-auto space-y-2">
          {specs.length === 0 ? (
            <Card className="border-dashed border-border">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                No specs yet. Create your first spec to get started.
              </CardContent>
            </Card>
          ) : (
            specs.map(spec => (
              <Card
                key={spec.id}
                className={`cursor-pointer transition-all ${
                  selectedSpec?.id === spec.id ? 'ring-2' : ''
                }`}
                style={selectedSpec?.id === spec.id ? { borderColor: 'hsl(var(--primary))' } : {}}
                onClick={() => {
                  setSelectedSpec(spec);
                  setEditingSpec(null);
                  setFormValues(spec.values);
                  // Expand first section by default
                  setExpandedSections(new Set([spec.sections[0]?.id]));
                }}
              >
                <CardHeader className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
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
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMakeImmutable(selectedSpec.id)}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Lock
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSpec(selectedSpec.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {editingSpec && (
                      <>
                        <Button
                          size="sm"
                          onClick={handleUpdateSpec}
                          style={{ backgroundColor: 'hsl(var(--primary))' }}
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
                {selectedSpec.sections
                  .sort((a, b) => a.order - b.order)
                  .map(section => (
                    <div key={section.id} className="space-y-3">
                      {/* Section Header */}
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleSection(section.id)}
                      >
                        {expandedSections.has(section.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <h4 className="text-sm font-semibold">{section.name}</h4>
                        {section.isBase && (
                          <Badge variant="outline" className="text-xs">
                            Base
                          </Badge>
                        )}
                      </div>
                      {section.description && (
                        <p className="text-xs text-muted-foreground pl-6">
                          {section.description}
                        </p>
                      )}

                      {/* Section Fields */}
                      {expandedSections.has(section.id) && (
                        <div className="pl-6 space-y-4 border-l-2 border-border">
                          {section.fields.map(field => (
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
                        </div>
                      )}
                    </div>
                  ))}

                {/* Metadata */}
                <div className="pt-4 border-t border-border">
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
            <Card className="h-full flex items-center justify-center border-dashed border-border">
              <CardContent className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
                        className="cursor-pointer hover:ring-2 transition-all"
                        style={{ borderColor: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setFormValues({});
                        }}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5" style={{ color: 'hsl(var(--primary))' }} />
                            <div>
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {template.description}
                              </CardDescription>
                              <div className="text-xs text-muted-foreground mt-2">
                                {template.sections.length} sections
                              </div>
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
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleCreateSpec}
                      style={{ backgroundColor: 'hsl(var(--primary))' }}
                    >
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
