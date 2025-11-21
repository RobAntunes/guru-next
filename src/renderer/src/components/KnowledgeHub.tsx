import { useState, useEffect } from 'react';
import { guruService, KnowledgeBase, QueryResult } from '../services/guru-integration';
import { documentStorage } from '../services/document-storage';
import { knowledgeBaseStorage } from '../services/knowledge-base-storage';
import { documentGroupsStorage } from '../services/document-groups-storage';
import { fileService } from '../services/file-service';
import { CreateKBDialog } from './CreateKBDialog';
import { WebIndexerDialog } from './knowledge/WebIndexerDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Database, Clock, Upload, Trash2, Plus, Search, FolderOpen, ArrowUpDown, LucideArrowUpDown, ArrowLeft, Cross, Delete, RemoveFormatting, DeleteIcon, Eye, GitBranch, Network, List, Globe } from 'lucide-react';
import { UnifiedContextGraph } from './UnifiedContextGraph';
import { DocumentPreview } from './DocumentPreview';
import { DocumentOrganizer } from './DocumentOrganizer';
import { SpecManagement } from './SpecManagement';
import { PromptManagement } from './PromptManagement';
import { projectStorage, Project } from '../services/project-storage';
import { analytics } from '../services/analytics';

interface KnowledgeHubProps {
  knowledgeBases: KnowledgeBase[];
  setKnowledgeBases: (kbs: KnowledgeBase[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function KnowledgeHub({ knowledgeBases, setKnowledgeBases, isLoading, setIsLoading }: KnowledgeHubProps) {
  const [selectedKB, setSelectedKB] = useState<string | null>(null);
  const [showCreateKBDialog, setShowCreateKBDialog] = useState(false);
  const [showWebIndexer, setShowWebIndexer] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<QueryResult | null>(null);
  const [kbDocuments, setKbDocuments] = useState<Record<string, Array<{\n    id: string;\n    filename: string;\n    category: string;\n    sizeBytes: number;\n    wordCount: number;\n    addedAt: Date;\n    metadata?: any;\n  }>>>({});
  const [showDocumentBrowser, setShowDocumentBrowser] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'resources' | 'specs' | 'prompts'>('resources');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [resourceView, setResourceView] = useState<'documents' | 'graph'>('documents');

  // Load documents and knowledge bases from local storage when component mounts
  useEffect(() => {
    loadCurrentProject();
  }, []);

  // Load data when project changes
  useEffect(() => {
    if (currentProject) {
      loadKnowledgeBasesFromStorage();
      loadDocumentsFromStorage();
    }
  }, [currentProject]);

  // Listen for project changes
  useEffect(() => {
    const handleProjectSwitch = () => {
      // Reset state when project switches
      setSelectedKB(null);
      setKnowledgeBases([]);\n      setKbDocuments({});
      // Reload data
      loadCurrentProject();\n    };
    
    window.addEventListener('project-switched', handleProjectSwitch);
    return () => {
      window.removeEventListener('project-switched', handleProjectSwitch);
    };\n  }, []);

  // Load documents for selected KB
  useEffect(() => {
    if (selectedKB) {
      loadKBDocumentsFromStorage(selectedKB);
    }
  }, [selectedKB]);

  const loadCurrentProject = async () => {
    try {
      const project = await projectStorage.getCurrentProject();
      setCurrentProject(project);
    } catch (error) {
      console.error('Failed to load current project:', error);
    }
  };\n
  const loadKnowledgeBasesFromStorage = async () => {
    if (!currentProject) return;
    
    try {
      const storedKBs = await knowledgeBaseStorage.getKnowledgeBasesByProject(currentProject.id);
      setKnowledgeBases(storedKBs);
      
      // If selected KB is not in current project, deselect it
      if (selectedKB && !storedKBs.find(kb => kb.id === selectedKB)) {
        setSelectedKB(null);
      }
    } catch (error) {
      console.error('Failed to load knowledge bases from storage:', error);
    }
  };\n
  const loadDocumentsFromStorage = async () => {
    try {
      // Load all documents and organize by KB
      const allDocs = await documentStorage.getAllDocuments();
      const docsByKB: Record<string, any[]> = {};

      allDocs.forEach(doc => {
        if (!docsByKB[doc.knowledgeBaseId]) {
          docsByKB[doc.knowledgeBaseId] = [];
        }
        docsByKB[doc.knowledgeBaseId].push({\n          id: doc.id,\n          filename: doc.filename,\n          category: doc.category,\n          sizeBytes: 0,\n          wordCount: 0,\n          addedAt: new Date(doc.addedAt),\n          metadata: doc.metadata\n        });\n      });

      setKbDocuments(docsByKB);
    } catch (error) {
      console.error('Failed to load documents from storage:', error);
    }
  };\n
  const loadKBDocumentsFromStorage = async (kbId: string) => {
    try {
      const docs = await documentStorage.getDocumentsByKB(kbId);
      const formattedDocs = docs.map(doc => ({\n        id: doc.id,\n        filename: doc.filename,\n        category: doc.category,\n        sizeBytes: 0,\n        wordCount: 0,\n        addedAt: new Date(doc.addedAt),\n        metadata: doc.metadata\n      }));

      setKbDocuments(prev => ({\n        ...prev,\n        [kbId]: formattedDocs\n      }));\n    } catch (error) {
      console.error('Failed to load KB documents from storage:', error);
    }
  };\n

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedKB) return;

    try {
      // Only delete from local storage - we're not actually deleting files from disk
      await documentStorage.deleteDocument(documentId);

      // Update local state
      setKbDocuments(prevDocs => ({\n        ...prevDocs,\n        [selectedKB]: (prevDocs[selectedKB] || []).filter(doc => doc.id !== documentId)\n      }));\n
      // Update KB document count in storage
      const newCount = Math.max(0, (kbDocuments[selectedKB] || []).length - 1);
      await knowledgeBaseStorage.updateKnowledgeBase(selectedKB, {\n        documentCount: newCount\n      });\n
      // Update local state
      setKnowledgeBases(knowledgeBases.map(kb =>
        kb.id === selectedKB
          ? { ...kb, documentCount: newCount }
          : kb
      ));

      analytics.trackDocument('deleted', documentId, { kb_id: selectedKB });
    } catch (error) {
      console.error('Failed to remove document:', error);
      analytics.trackError(error as Error, 'delete_document');
    }
  };\n
  const handleDeleteKnowledgeBase = async (kbId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    const kb = knowledgeBases.find(k => k.id === kbId);
    if (!kb) return;

    if (!confirm(`Delete knowledge base \"${kb.name}\"?\\n\\nThis will remove the knowledge base and all its documents from your local index.`)) {
      return;
    }

    try {
      // Delete all documents for this KB
      await documentStorage.deleteDocumentsByKB(kbId);

      // Delete the KB itself
      await knowledgeBaseStorage.deleteKnowledgeBase(kbId);

      // Update local state
      setKnowledgeBases(knowledgeBases.filter(k => k.id !== kbId));
      setKbDocuments(prevDocs => {
        const newDocs = { ...prevDocs };
        delete newDocs[kbId];
        return newDocs;\n      });

      // If we just deleted the selected KB, deselect it
      if (selectedKB === kbId) {
        setSelectedKB(null);
      }

      analytics.trackKnowledgeBase('deleted', kbId, { name: kb.name, documentCount: kb.documentCount });
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      alert('Failed to delete knowledge base');
      analytics.trackError(error as Error, 'delete_kb');
    }
  };\n
  const handleFileUpload = async () => {
    if (!selectedKB) return;

    console.log('Opening file dialog...');
    setIsLoading(true);
    
    try {
      // Use new file service to select and process files
      const result = await fileService.uploadToKnowledgeBase(selectedKB);
      
      if (result.count === 0) {
        setIsLoading(false);
        return;
      }

      console.log(`Processing ${result.count} files...`);

      // Add documents to local storage
      await documentStorage.addDocuments(selectedKB, result.documents);

      console.log('Documents added to storage');

      // Reload documents from storage
      await loadKBDocumentsFromStorage(selectedKB);

      // Update knowledge base document count
      const updatedKBs = knowledgeBases.map(kb => {
        if (kb.id === selectedKB) {
          return {
            ...kb,
            documentCount: (kb.documentCount || 0) + result.count
          };
        }\n        return kb;
      });
      setKnowledgeBases(updatedKBs);
      await knowledgeBaseStorage.updateKnowledgeBase(selectedKB, {
        documentCount: (knowledgeBases.find(kb => kb.id === selectedKB)?.documentCount || 0) + result.count
      });

      alert(`Successfully uploaded ${result.count} document(s)!`);
      analytics.trackDocument('uploaded', selectedKB, { count: result.count, kb_id: selectedKB });
    } catch (error) {
      console.error('Failed to upload documents:', error);
      alert('Failed to upload documents: ' + (error as Error).message);
      analytics.trackError(error as Error, 'upload_documents');
    } finally {
      setIsLoading(false);
    }
  };\n



  const getDocumentContent = async (docId: string): Promise<string | null> => {
    try {
      const allDocs = await documentStorage.getAllDocuments();
      const doc = allDocs.find(d => d.id === docId);
      return doc?.content || null;
    } catch (error) {
      console.error('Failed to get document content:', error);
      return null;
    }
  };\n
  const handleRAGQuery = async () => {
    if (!selectedKB || !ragQuery.trim()) return;

    setIsLoading(true);
    try {
      const result = await guruService.queryKnowledgeBase(\n        selectedKB,\n        ragQuery,\n        {\n          includeCognitiveInsights: true,\n          responseMode: 'comprehensive'\n        }\n      );
      setRagResults(result);
      analytics.trackSearch(ragQuery, result.sources?.length || 0, 'rag_query');
    } catch (error) {
      console.error("RAG query failed:", error);
      analytics.trackError(error as Error, 'rag_query');
    }
    setIsLoading(false);
  };\n
  const selectedKBData = knowledgeBases.find(kb => kb.id === selectedKB);

  const handleCreateProject = async () => {
    try {
      const project = await projectStorage.createProject(\n        'New Project',\n        'A workspace for your knowledge management'\n      );
      await projectStorage.setCurrentProject(project.id);
      setCurrentProject(project);
      // Trigger reload
      window.dispatchEvent(new Event('project-switched'));
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };\n
  const handleOpenProject = async () => {
    try {
      const projects = await projectStorage.getAllProjects();
      if (projects.length > 0) {
        await projectStorage.setCurrentProject(projects[0].id);
        setCurrentProject(projects[0]);
        window.dispatchEvent(new Event('project-switched'));
      }
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };\n
  // Check if we have a project
  if (!currentProject) {
    return (\n      <div className=\"flex h-full items-center justify-center p-6\">\n        <Card className=\"max-w-2xl w-full animate-scale-in\">\n          <CardContent className=\"p-12 text-center\">\n            {/* Icon with glow */}\n            <div className=\"relative inline-block mb-6\">\n              <div className=\"absolute -inset-4 bg-white/5 rounded-full blur-2xl animate-glow-pulse\" />\n              <div className=\"relative w-24 h-24 mx-auto rounded-3xl bg-muted border-2 border-foreground/20 flex items-center justify-center shadow-cosmic-lg\">\n                <FolderOpen className=\"h-12 w-12 text-foreground/80\" />\n              </div>\n            </div>\n
            <h3 className=\"text-2xl font-bold mb-3 animate-fade-in\">No Project Selected</h3>\n            <p className=\"text-sm text-muted-foreground mb-8 max-w-md mx-auto animate-fade-in delay-100\">\n              Create or select a project to organize your knowledge bases, specifications, and AI prompts in one unified workspace.\n            </p>\n
            {/* Action buttons */}\n            <div className=\"flex gap-3 justify-center animate-fade-in delay-200\">\n              <Button size=\"lg\" className=\"gap-2\" variant=\"outline\" onClick={handleCreateProject}>\n                <Plus className=\"h-4 w-4\" />\n                Create Project\n              </Button>\n              <Button size=\"lg\" variant=\"outline\" className=\"gap-2\" onClick={handleOpenProject}>\n                <FolderOpen className=\"h-4 w-4\" />\n                Open Project\n              </Button>\n            </div>\n
            {/* Features list */}\n            <div className=\"mt-12 pt-8 border-t border-border/50 grid grid-cols-3 gap-6 text-left animate-fade-in delay-300\">\n              <div className=\"space-y-2\">\n                <Database className=\"h-5 w-5 text-foreground/60 mb-2\" />\n                <h4 className=\"font-semibold text-sm\">Knowledge Bases</h4>\n                <p className=\"text-xs text-muted-foreground\">Organize documents and resources</p>\n              </div>\n              <div className=\"space-y-2\">\n                <GitBranch className=\"h-5 w-5 text-foreground/60 mb-2\" />\n                <h4 className=\"font-semibold text-sm\">Specifications</h4>\n                <p className=\"text-xs text-muted-foreground\">Define system behavior</p>\n              </div>\n              <div className=\"space-y-2\">\n                <FileText className=\"h-5 w-5 text-foreground/60 mb-2\" />\n                <h4 className=\"font-semibold text-sm\">Prompts</h4>\n                <p className=\"text-xs text-muted-foreground\">Reusable AI templates</p>\n              </div>\n            </div>\n          </CardContent>\n        </Card>\n      </div>\n    );\n  }\n
  return (\n    <div className=\"flex flex-col h-full overflow-hidden\">\n      <div className=\"flex-1 overflow-y-auto px-6 pt-12\">\n      {/* Header */}\n      <div className='flex justify-between my-2 shrink-0'>\n        <div className=\"flex justify-between shrink-0\">\n          <div className='flex items-start gap-2 flex-col'>\n            {selectedKB && activeTab === 'resources' && (\n              <button\n                onClick={() => setSelectedKB(null)}\n                className=\"gap-2 transition-colors mb-4\"\n              >\n                <ArrowLeft className=\"h-4 w-4\" />\n              </button>\n            )}\n            <h2 className=\"text-2xl font-light tracking-tight text-left\">\n              {activeTab === 'resources' ? selectedKBData?.name || 'Knowledge Management' : 'System Specifications'}\n            </h2>\n            <p className=\"text-sm text-muted-foreground mt-1 text-left mb-4\">\n              {activeTab === 'resources' \n                ? (selectedKBData?.description || 'Organize and manage your knowledge resources')\n                : 'Define core system behavior and constraints'\n              }\n            </p>\n          </div>\n        </div>\n        <div className=\"flex gap-2\">\n          {!selectedKB && activeTab === 'resources' && <Button\n            onClick={() => setShowCreateKBDialog(true)}\n            size=\"sm\"\n            variant=\"outline\"\n          >\n            <Plus className=\"h-3 w-3 mr-1\" />\n            New Knowledge Base\n          </Button>}\n        </div>\n      </div>\n
      {/* Main Content */}\n      {\n        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className=\"flex flex-col shrink-0 mb-6\">\n          <TabsList className=\"mb-6 shrink-0 border-b border-border/40 pb-0\">\n            <TabsTrigger value=\"resources\">\n              <Database className=\"h-3 w-3 mr-1\" />\n              Resources\n            </TabsTrigger>\n            <TabsTrigger value=\"specs\">\n              <GitBranch className=\"h-3 w-3 mr-1\" />\n              Specifications\n            </TabsTrigger>\n            <TabsTrigger value=\"prompts\">\n              <FileText className=\"h-3 w-3 mr-1\" />\n              Prompts\n            </TabsTrigger>\n          </TabsList>\n
        {/* Resources Tab */}\n        <TabsContent value=\"resources\" className=\"mt-0\">\n          <div className=\"w-full\">\n              {/* Show KB list when no KB is selected */}\n              {!selectedKB && knowledgeBases.length > 0 && (\n                <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6\">\n                  {knowledgeBases.map((kb) => (\n                    <Card\n                      key={kb.id}\n                      className={`cursor-pointer transition-all border-muted hover:border-muted-foreground/20`}\n                      onClick={() => setSelectedKB(kb.id)}\n                    >\n                      <CardHeader className=\"pb-3 relative\">\n                        <button\n                          onClick={(e) => handleDeleteKnowledgeBase(kb.id, e)}\n                          className=\"absolute top-4 right-4 p-1 rounded hover:bg-destructive/20 transition-colors\"\n                          title=\"Delete knowledge base\"\n                        >\n                          <Delete className=\"h-3 w-3\" />\n                        </button>\n                        <CardTitle className=\"text-base font-normal\">{kb.name}</CardTitle>\n                        <CardDescription className=\"text-xs\">{kb.description}</CardDescription>\n                      </CardHeader>\n                      <CardContent>\n                        <div className=\"space-y-2 text-xs text-muted-foreground\">\n                          <div className=\"flex items-center gap-2\">\n                            <FileText className=\"h-3 w-3\" />\n                            <span>{kb.documentCount} documents</span>\n                          </div>\n                          <div className=\"flex items-center gap-2\">\n                            <Clock className=\"h-3 w-3\" />\n                            <span>Updated: {new Date(kb.lastUpdated).toLocaleDateString()}</span>\n                          </div>\n                        </div>\n                      </CardContent>\n                    </Card>\n                  ))}\n                </div>\n              )}\n
              {/* Info Box */}\n              {knowledgeBases.length === 0 && (\n                <div className=\"flex h-full justify-center items-center\">\n                  <Card className=\"border-muted max-w-xl mx-auto\">\n                    <CardHeader className=\"pb-3\">\n                      <CardTitle className=\"text-base font-normal\">Getting Started</CardTitle>\n                    </CardHeader>\n                    <CardContent>\n                      <p className=\"text-sm text-muted-foreground mb-4\">\n                        Knowledge bases are your personal document repositories. They store your files persistently and allow AI to answer questions based on their content.\n                      </p>\n                      <Button\n                        onClick={() => setShowCreateKBDialog(true)}\n                        className=\"w-full\"\n                      >\n                        <Plus className=\"h-4 w-4 mr-2\" />\n                        Create Your First Knowledge Base\n                      </Button>\n                    </CardContent>\n                  </Card>\n                </div>\n              )}\n
              {/* KB Selected View with Tabs */}\n              {selectedKBData && selectedKB && (\n                <Tabs value={resourceView} onValueChange={(v) => setResourceView(v as any)} className=\"flex flex-col\">\n                  <TabsList className=\"mb-6 shrink-0 border-b border-border/40 pb-0\">\n                    <TabsTrigger value=\"documents\">\n                      <FileText className=\"h-3 w-3 mr-1\" />\n                      Documents\n                    </TabsTrigger>\n                    <TabsTrigger value=\"graph\">\n                      <Network className=\"h-3 w-3 mr-1\" />\n                      Context Graph\n                    </TabsTrigger>\n                  </TabsList>\n
                  {/* Documents Tab */}\n                  <TabsContent value=\"documents\" className=\"mt-0\">\n                    <div className=\"space-y-4 pb-6\">\n                      <Card className=\"border-muted\">\n                        <CardHeader className='flex flex-row justify-between items-center'>\n                          <CardTitle className=\"text-lg font-normal\">Documents</CardTitle>\n                          <CardDescription className=\"text-xs\"><em>Click to preview</em></CardDescription>\n                        </CardHeader>\n                        <CardContent className=\"flex flex-col gap-4\">\n                          {/* Document Organizer */}\n                          <DocumentOrganizer\n                            knowledgeBaseId={selectedKB}\n                            knowledgeBaseName={selectedKBData.name}\n                            documents={kbDocuments[selectedKB] || []}\n                            onDocumentSelect={setSelectedDocument}\n                            onDocumentDelete={handleDeleteDocument}\n                            onDocumentToggle={() => {\n                              loadKBDocumentsFromStorage(selectedKB);\n                            }}\n                            onGroupsChange={() => {\n                              loadKBDocumentsFromStorage(selectedKB);\n                            }}\n                          />\n
                          {/* Upload Button */}\n                          <div className='flex justify-end mt-4 gap-2'>\n                             <Button\n                              onClick={() => setShowWebIndexer(true)}\n                              size=\"sm\"\n                              variant=\"outline\"\n                            >\n                              <Globe className=\"h-3 w-3 mr-1\" />\n                              Add Online Docs\n                            </Button>\n                            <Button\n                              onClick={handleFileUpload}\n                              size=\"sm\"\n                              variant=\"outline\"\n                              disabled={isLoading}\n                            >\n                              <Plus className=\"h-3 w-3 mr-1\" />\n                              Add Documents\n                            </Button>\n                          </div>\n                        </CardContent>\n                      </Card>\n                    </div>\n                  </TabsContent>\n
                  {/* Graph View Tab */}\n                  <TabsContent value=\"graph\" className=\"mt-0\">\n                    <UnifiedContextGraph\n                      knowledgeGroups={kbDocuments[selectedKB]?.map(doc => ({\n                        id: doc.id,\n                        name: doc.filename,\n                        documents: [],\n                        metadata: doc.metadata\n                      })) || []}\n                      onToggleNode={() => {\n                        loadKBDocumentsFromStorage(selectedKB);\n                      }}\n                    />\n                  </TabsContent>\n                </Tabs>\n              )}\n          </div>\n        </TabsContent>\n
        {/* Specs Tab */}\n        <TabsContent value=\"specs\" className=\"mt-0\">\n          {!selectedKB ? (\n            <div className=\"flex h-full items-center justify-center\">\n              <Card className=\"max-w-md\">\n                <CardContent className=\"p-8 text-center\">\n                  <GitBranch className=\"h-12 w-12 mx-auto mb-4 text-muted-foreground\" />\n                  <h3 className=\"text-lg font-medium mb-2\">Select a Knowledge Base</h3>\n                  <p className=\"text-sm text-muted-foreground\">\n                    Select a knowledge base from the Resources tab to manage its specifications.\n                  </p>\n                </CardContent>\n              </Card>\n            </div>\n          ) : (\n            <SpecManagement\n              onSpecToggle={(specId, enabled) => {\n                console.log(`Spec ${specId} toggled to ${enabled}`);\n                // TODO: Update AI context with spec changes\n              }}\n            />\n          )}\n        </TabsContent>\n
        {/* Prompts Tab */}\n        <TabsContent value=\"prompts\" className=\"mt-0\">\n          {!selectedKB ? (\n            <div className=\"flex h-full items-center justify-center\">\n              <Card className=\"max-w-md\">\n                <CardContent className=\"p-8 text-center\">\n                  <FileText className=\"h-12 w-12 mx-auto mb-4 text-muted-foreground\" />\n                  <h3 className=\"text-lg font-medium mb-2\">Select a Knowledge Base</h3>\n                  <p className=\"text-sm text-muted-foreground\">\n                    Select a knowledge base from the Resources tab to manage its prompts.\n                  </p>\n                </CardContent>\n              </Card>\n            </div>\n          ) : (\n          <PromptManagement \n            onPromptExecute={(prompt, variables) => {\n              console.log('Executing prompt:', prompt);\n              console.log('With variables:', variables);\n              // TODO: Execute prompt through AI service\n            }}\n          />\n          )}\n        </TabsContent>\n        </Tabs>\n      }\n
      <CreateKBDialog\n        isOpen={showCreateKBDialog}\n        onClose={() => setShowCreateKBDialog(false)}\n        onCreate={async (name, description) => {\n          if (!currentProject) {\n            console.error('No project selected');\n            return;\n          }\n          \n          try {\n            // Create KB in local storage with project association\n            const newKB = await knowledgeBaseStorage.createKnowledgeBase(name, description);\n\n            // Reload knowledge bases to ensure proper filtering by project\n            await loadKnowledgeBasesFromStorage();\n            \n            // Select the new KB\n            setSelectedKB(newKB.id);\n          } catch (error) {\n            console.error('Failed to create knowledge base:', error);\n          }\n        }}\n      />\n      \n      {/* Web Indexer Dialog */}\n      <WebIndexerDialog\n        isOpen={showWebIndexer}\n        onClose={() => setShowWebIndexer(false)}\n        onIndexComplete={async () => {\n          if (selectedKB) {\n            await loadKBDocumentsFromStorage(selectedKB);\n            // Update document count\n            // (This is a simplified update, real app should fetch fresh count)\n          }\n        }}\n      />\n
      {/* Document Preview Modal */}\n      {selectedDocument && (\n        <DocumentPreview\n          document={selectedDocument}\n          onClose={() => setSelectedDocument(null)}\n          getDocumentContent={getDocumentContent}\n        />\n      )}\n      </div>\n    </div>\n  );\n}