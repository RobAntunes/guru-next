import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, FolderKanban, FileText, Folder, Home, Database, Brain, Code, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { projectStorage, Project } from '../services/project-storage';
import { knowledgeBaseStorage } from '../services/knowledge-base-storage';
import { documentStorage } from '../services/document-storage';

interface ProjectSidebarProps {
  currentView: string;
  onNavigate: (view: string, kbId?: string) => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ currentView, onNavigate }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [expandedKBs, setExpandedKBs] = useState<Set<string>>(new Set());
  const [kbDocuments, setKbDocuments] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadProjects();
    loadCurrentProject();
  }, []);

  useEffect(() => {
    if (currentProject) {
      loadKnowledgeBases();
    }
  }, [currentProject]);

  const loadProjects = async () => {
    try {
      const allProjects = await projectStorage.getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadCurrentProject = async () => {
    try {
      const project = await projectStorage.getCurrentProject();
      setCurrentProject(project);
    } catch (error) {
      console.error('Failed to load current project:', error);
    }
  };

  const loadKnowledgeBases = async () => {
    if (!currentProject) return;

    try {
      const kbs = await knowledgeBaseStorage.getKnowledgeBasesByProject(currentProject.id);
      setKnowledgeBases(kbs);

      // Load documents for each KB
      for (const kb of kbs) {
        const docs = await documentStorage.getDocumentsByKB(kb.id);
        setKbDocuments(prev => ({ ...prev, [kb.id]: docs }));
      }
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    }
  };

  const toggleKB = (kbId: string) => {
    setExpandedKBs(prev => {
      const next = new Set(prev);
      if (next.has(kbId)) {
        next.delete(kbId);
      } else {
        next.add(kbId);
      }
      return next;
    });
  };

  return (
    <div className="w-80 h-full bg-card border-r border-border flex flex-col">
      {/* Projects Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
            Projects
          </h2>
          <button className="inline-flex items-center justify-center w-5 h-5 rounded-lg border border-border text-foreground/80 text-[16px] hover:bg-muted hover:border-foreground/70 transition">
            +
          </button>
        </div>

        {/* Active Project */}
        {currentProject && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/80 text-foreground border-l-2 border-primary">
              <span className="w-1 h-5 rounded-full bg-primary/80"></span>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Active
                </span>
                <span className="text-[13px] text-foreground truncate">
                  {currentProject.name}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Other Projects */}
        {projects.filter(p => p.id !== currentProject?.id).map(project => (
          <button
            key={project.id}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-muted-foreground hover:bg-muted/50 transition mt-1"
            onClick={async () => {
              await projectStorage.setCurrentProject(project.id);
              window.location.reload();
            }}
          >
            <span className="w-1 h-5 rounded-full bg-transparent"></span>
            <span className="text-[13px]">{project.name}</span>
          </button>
        ))}
      </div>

      {/* Navigation Section */}
      <div className="p-4 border-b border-border">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-3">
          Navigation
        </h2>
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'dashboard'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'dashboard' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <Home className="h-4 w-4" />
            <span className="text-sm">Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate('knowledge')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'knowledge'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'knowledge' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <Database className="h-4 w-4" />
            <span className="text-sm">Knowledge</span>
          </button>

          <button
            onClick={() => onNavigate('specs')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'specs'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'specs' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <FileText className="h-4 w-4" />
            <span className="text-sm">Specs</span>
          </button>

          <button
            onClick={() => onNavigate('prompts')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'prompts'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'prompts' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm">Prompts</span>
          </button>

          <button
            onClick={() => onNavigate('memory')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'memory'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'memory' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <Brain className="h-4 w-4" />
            <span className="text-sm">Memory</span>
          </button>

          <button
            onClick={() => onNavigate('symbols')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'symbols'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'symbols' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <Code className="h-4 w-4" />
            <span className="text-sm">Symbols</span>
          </button>

          <button
            onClick={() => onNavigate('context')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'context'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'context' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <FolderKanban className="h-4 w-4" />
            <span className="text-sm">Context Builder</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-left relative ${
              currentView === 'settings'
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {currentView === 'settings' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--primary))' }}>▸</span>
            )}
            <SettingsIcon className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </div>

      {/* Context Tree Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em] mb-3">
          Context Tree
        </h2>

        {/* Knowledge Bases */}
        <div className="space-y-1">
          {knowledgeBases.map(kb => {
            const isExpanded = expandedKBs.has(kb.id);
            const docs = kbDocuments[kb.id] || [];

            return (
              <div key={kb.id}>
                <button
                  onClick={() => toggleKB(kb.id)}
                  className="w-full flex items-center gap-2 px-1.5 py-1 hover:bg-muted/50 rounded-md transition text-left group"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground/90 flex-1 truncate">
                    {kb.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {docs.length}
                  </span>
                </button>

                {/* Documents */}
                {isExpanded && (
                  <div className="pl-6 mt-1 space-y-0.5">
                    {docs.map(doc => (
                      <button
                        key={doc.id}
                        className="w-full flex items-center gap-2 px-1.5 py-1 hover:bg-muted/50 rounded-md transition text-left"
                        onClick={() => {
                          onNavigate('knowledge', kb.id);
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground/90 truncate flex-1">
                          {doc.filename}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
