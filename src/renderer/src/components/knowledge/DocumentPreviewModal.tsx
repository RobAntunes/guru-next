import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText } from 'lucide-react';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    title: string;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, onClose, documentId, title }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && documentId) {
            loadDocumentContent();
        } else {
            setContent('');
            setError(null);
        }
    }, [isOpen, documentId]);

    const loadDocumentContent = async () => {
        setLoading(true);
        setError(null);
        try {
            // We'll use the search API to find chunks for this document
            // This is a workaround since we don't have a direct 'get document' API yet
            // In a real app, we'd have a specific endpoint for this
            const result = await (window as any).api.document.search('', { document_id: documentId }, 1000);

            if (result.success && result.data) {
                // Sort chunks by position
                const chunks = result.data.sort((a: any, b: any) => a.position - b.position);
                const fullText = chunks.map((c: any) => c.content).join('\n\n');
                setContent(fullText || 'No content found.');
            } else {
                setError('Failed to load document content.');
            }
        } catch (err: any) {
            console.error('Error loading document:', err);
            setError(err.message || 'Failed to load document content');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col bg-background border-border">
                <DialogHeader className="border-b border-border pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="truncate">{title}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative min-h-0">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-400">
                            {error}
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full p-4">
                            <div className="prose prose-invert prose-sm max-w-none font-mono whitespace-pre-wrap">
                                {content}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
