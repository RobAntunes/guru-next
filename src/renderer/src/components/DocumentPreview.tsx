import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, FileText } from 'lucide-react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface DocumentPreviewProps {
  document: {
    id: string;
    filename: string;
    content?: string;
    category: string;
    addedAt: Date;
    metadata?: any;
  } | null;
  onClose: () => void;
  getDocumentContent: (docId: string) => Promise<string | null>;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  document, 
  onClose,
  getDocumentContent 
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfData, setPdfData] = useState<string | null>(null);
  
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    if (document) {
      loadContent();
    }
  }, [document]);

  const loadContent = async () => {
    if (!document) return;
    
    setIsLoading(true);
    try {
      const docContent = await getDocumentContent(document.id);
      if (docContent) {
        const isPdfFile = document.filename.toLowerCase().endsWith('.pdf');
        setIsPdf(isPdfFile);
        
        if (isPdfFile) {
          let pdfBase64 = docContent;
          
          if (docContent.includes('base64,')) {
            pdfBase64 = docContent.split('base64,')[1];
          }
          
          const dataUri = `data:application/pdf;base64,${pdfBase64}`;
          setPdfData(dataUri);
        } else {
          if (docContent.includes('base64,') || /^[A-Za-z0-9+/]+=*$/.test(docContent)) {
            try {
              const binaryString = atob(docContent.replace(/^data:.*,/, ''));
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const decoded = new TextDecoder('utf-8').decode(bytes);
              setContent(decoded);
            } catch (error) {
              console.error('Failed to decode content:', error);
              setContent(docContent);
            }
          } else {
            setContent(docContent);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load document content:', error);
      setContent('Failed to load document content');
    }
    setIsLoading(false);
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="relative bg-background border border-muted rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden !text-left">
        <div className="px-6 py-4 border-b border-muted flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-normal">{document.filename}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-sm text-muted-foreground">Loading document...</div>
            </div>
          ) : isPdf && pdfData ? (
            <div className="h-[600px]">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer 
                  fileUrl={pdfData}
                  plugins={[defaultLayoutPluginInstance]}
                />
              </Worker>
            </div>
          ) : (
            <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ node, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match?.[1] || '';
                    const inline = !className;
                    
                    return !inline ? (
                      <div className="relative group my-4">
                        {language && (
                          <div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/50 rounded-bl">
                            {language}
                          </div>
                        )}
                        <pre className="bg-muted/30 rounded-md p-4 overflow-x-auto">
                          <code className={className}>{children}</code>
                        </pre>
                      </div>
                    ) : (
                      <code className="bg-muted/30 px-1 py-0.5 rounded text-sm font-mono">
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => <h1 className="text-2xl font-semibold mb-4 mt-6">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-muted pl-4 italic my-4">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};