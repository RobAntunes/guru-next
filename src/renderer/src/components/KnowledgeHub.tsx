import { useState, useEffect } from 'react';
import { guruService, KnowledgeBase, QueryResult } from '../services/guru-integration';
import { documentStorage } from '../services/document-storage';
import { knowledgeBaseStorage } from '../services/knowledge-base-storage';
import { documentGroupsStorage } from '../services/document-groups-storage';
import { fileService } from '../services/file-service';
import { CreateKBDialog } from './CreateKBDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Database, Clock, Upload, Trash2, Plus, Search, FolderOpen, ChevronRight, ArrowUpDown, LucideArrowUpDown, ArrowLeft, Cross, Delete, RemoveFormatting, DeleteIcon, Eye, GitBranch } from 'lucide-react';
import { CognitiveInsightsPanel } from './CognitiveInsightsPanel';
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
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<QueryResult | null>(null);
  const [kbDocuments, setKbDocuments] = useState<Record<string, Array<{
    id: string;
    filename: string;
    category: string;
    sizeBytes: number;
    wordCount: number;
    addedAt: Date;
    metadata?: any;
  }>>>({});
  const [showDocumentBrowser, setShowDocumentBrowser] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'resources' | 'specs' | 'prompts'>('resources');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

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
      setKnowledgeBases([]);
      setKbDocuments({});
      // Reload data
      loadCurrentProject();
    };
    
    window.addEventListener('project-switched', handleProjectSwitch);
    return () => {
      window.removeEventListener('project-switched', handleProjectSwitch);
    };
  }, []);

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
  };

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
  };

  const loadDocumentsFromStorage = async () => {
    try {
      // Load all documents and organize by KB
      const allDocs = await documentStorage.getAllDocuments();
      const docsByKB: Record<string, any[]> = {};

      allDocs.forEach(doc => {
        if (!docsByKB[doc.knowledgeBaseId]) {
          docsByKB[doc.knowledgeBaseId] = [];
        }
        docsByKB[doc.knowledgeBaseId].push({
          id: doc.id,
          filename: doc.filename,
          category: doc.category,
          sizeBytes: 0,
          wordCount: 0,
          addedAt: new Date(doc.addedAt),
          metadata: doc.metadata
        });
      });

      setKbDocuments(docsByKB);
    } catch (error) {
      console.error('Failed to load documents from storage:', error);
    }
  };

  const loadKBDocumentsFromStorage = async (kbId: string) => {
    try {
      const docs = await documentStorage.getDocumentsByKB(kbId);
      const formattedDocs = docs.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        category: doc.category,
        sizeBytes: 0,
        wordCount: 0,
        addedAt: new Date(doc.addedAt),
        metadata: doc.metadata
      }));

      setKbDocuments(prev => ({
        ...prev,
        [kbId]: formattedDocs
      }));
    } catch (error) {
      console.error('Failed to load KB documents from storage:', error);
    }
  };


  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedKB) return;

    try {
      // Only delete from local storage - we're not actually deleting files from disk
      await documentStorage.deleteDocument(documentId);

      // Update local state
      setKbDocuments(prevDocs => ({
        ...prevDocs,
        [selectedKB]: (prevDocs[selectedKB] || []).filter(doc => doc.id !== documentId)
      }));

      // Update KB document count in storage
      const newCount = Math.max(0, (kbDocuments[selectedKB] || []).length - 1);
      await knowledgeBaseStorage.updateKnowledgeBase(selectedKB, {
        documentCount: newCount
      });

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
  };

  const handleDeleteKnowledgeBase = async (kbId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click

    const kb = knowledgeBases.find(k => k.id === kbId);
    if (!kb) return;

    if (!confirm(`Delete knowledge base "${kb.name}"?\n\nThis will remove the knowledge base and all its documents from your local index.`)) {
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
        return newDocs;
      });

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
  };

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
        }
        return kb;
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
  };




  const getDocumentContent = async (docId: string): Promise<string | null> => {
    try {
      const allDocs = await documentStorage.getAllDocuments();
      const doc = allDocs.find(d => d.id === docId);
      return doc?.content || null;
    } catch (error) {
      console.error('Failed to get document content:', error);
      return null;
    }
  };

  const handleRAGQuery = async () => {
    if (!selectedKB || !ragQuery.trim()) return;

    setIsLoading(true);
    try {
      const result = await guruService.queryKnowledgeBase(
        selectedKB,
        ragQuery,
        {
          includeCognitiveInsights: true,
          responseMode: 'comprehensive'
        }
      );
      setRagResults(result);
      analytics.trackSearch(ragQuery, result.sources?.length || 0, 'rag_query');
    } catch (error) {
      console.error("RAG query failed:", error);
      analytics.trackError(error as Error, 'rag_query');
    }
    setIsLoading(false);
  };

  const selectedKBData = knowledgeBases.find(kb => kb.id === selectedKB);

  // Check if we have a project
  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
            <p className="text-sm text-muted-foreground">
              Please select or create a project from the sidebar to manage your knowledge bases.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative top-12 px-6">
      {/* Header */}
      <div className='flex justify-between mb-4'>
        <div className="flex justify-between shrink-0">
          <div className='flex items-start gap-2 flex-col'>
            {selectedKB && activeTab === 'resources' && (
              <button
                onClick={() => setSelectedKB(null)}
                className="gap-2 transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-2xl font-light tracking-tight text-left">
              {activeTab === 'resources' ? selectedKBData?.name || 'Knowledge Management' : 'System Specifications'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 text-left mb-4">
              {activeTab === 'resources' 
                ? (selectedKBData?.description || 'Organize and manage your knowledge resources')
                : 'Define core system behavior and constraints'
              }
            </p>
          </div>
        </div>
        {!selectedKB && activeTab === 'resources' && <Button
          onClick={() => setShowCreateKBDialog(true)}
          size="sm"
          variant="outline"
        >
          <Plus className="h-3 w-3 mr-1" />
          New Knowledge Base
        </Button>}
      </div>

      {/* Main Content */}
      {
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 mb-4 shrink-0 gap-1">
            <TabsTrigger value="resources">
              <Database className="h-3 w-3 mr-1" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="specs">
              <GitBranch className="h-3 w-3 mr-1" />
              Specifications
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <FileText className="h-3 w-3 mr-1" />
              Prompts
            </TabsTrigger>
          </TabsList>

        {/* Resources Tab */}
        <TabsContent value="resources" className="flex-1 overflow-hidden mt-0">
          <div className="flex gap-6 h-full">
        {/* Left Content */}
        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto">
          {/* Show KB list when no KB is selected */}
          {!selectedKB && knowledgeBases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {knowledgeBases.map((kb) => (
                <Card
                  key={kb.id}
                  className={`cursor-pointer transition-all border-muted hover:border-muted-foreground/20`}
                  onClick={() => setSelectedKB(kb.id)}
                >
                  <CardHeader className="pb-3 relative">
                    <button
                      onClick={(e) => handleDeleteKnowledgeBase(kb.id, e)}
                      className="absolute top-4 right-4 p-1 rounded hover:bg-destructive/20 transition-colors"
                      title="Delete knowledge base"
                    >
                      <Delete className="h-3 w-3" />
                    </button>
                    <CardTitle className="text-base font-normal">{kb.name}</CardTitle>
                    <CardDescription className="text-xs">{kb.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        <span>{kb.documentCount} documents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Updated: {new Date(kb.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {/* Info Box */}
          {knowledgeBases.length === 0 && (
            <div className="flex h-full justify-center items-center">
              <Card className="border-muted max-w-xl mx-auto">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-normal">Getting Started</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Knowledge bases are your personal document repositories. They store your files persistently and allow AI to answer questions based on their content.
                  </p>
                  <Button
                    onClick={() => setShowCreateKBDialog(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Knowledge Base
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Document Upload Section */}
          {selectedKBData && selectedKB && (
            <Card className="border-muted h-full">
              <CardHeader className='flex flex-row justify-between items-center'>
                <CardTitle className="text-lg font-normal">Resources</CardTitle>
                <CardDescription className="text-xs"><em>Click to preview</em></CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 h-[85%]">
                {/* Document Organizer */}
                <div className="flex-1 overflow-hidden">
                  <DocumentOrganizer
                    knowledgeBaseId={selectedKB}
                    documents={kbDocuments[selectedKB] || []}
                    onDocumentSelect={setSelectedDocument}
                    onDocumentDelete={handleDeleteDocument}
                    onDocumentToggle={() => {
                      // Force refresh of documents to update CognitiveInsightsPanel
                      loadKBDocumentsFromStorage(selectedKB);
                    }}
                    onGroupsChange={() => {
                      // Force refresh when groups are added/deleted
                      loadKBDocumentsFromStorage(selectedKB);
                    }}
                  />
                </div>

                {/* Upload Button */}
                <div className='flex justify-end'>
                  <Button
                    onClick={handleFileUpload}
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Cognitive Insights */}
        {selectedKB && activeTab === 'resources' && (
          <div className="w-96 h-full overflow-hidden">
            <CognitiveInsightsPanel
              knowledgeBaseId={selectedKB}
              documents={kbDocuments[selectedKB] || []}
              knowledgeBase={selectedKBData ? {
                name: selectedKBData.name,
                description: selectedKBData.description,
                documentCount: selectedKBData.documentCount,
                chunkCount: selectedKBData.chunkCount,
                lastUpdated: selectedKBData.lastUpdated.toISOString()
              } : undefined}
              onDocumentToggle={() => {
                loadKBDocumentsFromStorage(selectedKB);
              }}
            />
          </div>
        )}
          </div>
        </TabsContent>

        {/* Specs Tab */}
        <TabsContent value="specs" className="flex-1 overflow-hidden mt-0">
          {!selectedKB ? (
            <div className="flex h-full items-center justify-center">
              <Card className="max-w-md">
                <CardContent className="p-8 text-center">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a knowledge base from the Resources tab to manage its specifications.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
          <div className="flex gap-6 h-full">
            {/* Spec Management takes full width when no KB is selected */}
            <div className="flex-1">
              <SpecManagement 
                onSpecToggle={(specId, enabled) => {
                  console.log(`Spec ${specId} toggled to ${enabled}`);
                  // TODO: Update AI context with spec changes
                }}
              />
            </div>
            
            {/* Show Cognitive Insights Panel for specs tab too */}
            {selectedKB && (
              <div className="w-96 h-full overflow-hidden">
                <CognitiveInsightsPanel
                  knowledgeBaseId={selectedKB}
                  documents={kbDocuments[selectedKB] || []}
                  knowledgeBase={selectedKBData ? {
                    name: selectedKBData.name,
                    description: selectedKBData.description,
                    documentCount: selectedKBData.documentCount,
                    chunkCount: selectedKBData.chunkCount,
                    lastUpdated: selectedKBData.lastUpdated.toISOString()
                  } : undefined}
                  onDocumentToggle={() => {
                    loadKBDocumentsFromStorage(selectedKB);
                  }}
                />
              </div>
            )}
          </div>
          )}
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="flex-1 overflow-hidden mt-0">
          {!selectedKB ? (
            <div className="flex h-full items-center justify-center">
              <Card className="max-w-md">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Select a Knowledge Base</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a knowledge base from the Resources tab to manage its prompts.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
          <PromptManagement 
            onPromptExecute={(prompt, variables) => {
              console.log('Executing prompt:', prompt);
              console.log('With variables:', variables);
              // TODO: Execute prompt through AI service
            }}
          />
          )}
        </TabsContent>
        </Tabs>
      }

      <CreateKBDialog
        isOpen={showCreateKBDialog}
        onClose={() => setShowCreateKBDialog(false)}
        onCreate={async (name, description) => {
          if (!currentProject) {
            console.error('No project selected');
            return;
          }
          
          try {
            // Create KB in local storage with project association
            const newKB = await knowledgeBaseStorage.createKnowledgeBase(name, description);

            // Reload knowledge bases to ensure proper filtering by project
            await loadKnowledgeBasesFromStorage();
            
            // Select the new KB
            setSelectedKB(newKB.id);
          } catch (error) {
            console.error('Failed to create knowledge base:', error);
          }
        }}
      />

      {/* Document Preview Modal */}
      {selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          getDocumentContent={getDocumentContent}
        />
      )}
    </div >
  );
}