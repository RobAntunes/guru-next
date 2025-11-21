import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Globe, AlertCircle, CheckCircle } from 'lucide-react';

interface WebIndexerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onIndexComplete?: () => void;
}

export function WebIndexerDialog({ isOpen, onClose, onIndexComplete }: WebIndexerDialogProps) {
  const [url, setUrl] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'indexing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pagesIndexed, setPagesIndexed] = useState(0);

  const handleIndex = async () => {
    if (!url) return;

    try {
      setIsIndexing(true);
      setStatus('indexing');
      setErrorMessage('');
      setPagesIndexed(0);

      // Automatically crawl deep to capture full documentation
      // depth: 20 should be sufficient for almost all documentation sites
      // maxPages: 1000 prevents infinite runaway crawling while allowing large sites
      const result = await window.api.document.indexWeb({
        url,
        depth: 20, 
        maxPages: 1000 
      });

      if (result.success) {
        setStatus('success');
        setPagesIndexed(result.pagesCount || result.chunks || 0);
        setTimeout(() => {
          if (onIndexComplete) onIndexComplete();
          onClose();
          // Reset after closing
          setTimeout(() => {
            setStatus('idle');
            setUrl('');
          }, 500);
        }, 1500);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Failed to index website');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isIndexing && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Add Online Documentation
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="url">Documentation URL</Label>
            <Input
              id="url"
              placeholder="https://docs.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isIndexing}
              className="bg-neutral-800 border-neutral-700"
            />
            <p className="text-xs text-muted-foreground">
              Enter the root URL of the documentation. The indexer will automatically crawl and index all linked pages within the documentation.
            </p>
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-500 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>Successfully indexed {pagesIndexed} pages!</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isIndexing}>
            Cancel
          </Button>
          <Button onClick={handleIndex} disabled={!url || isIndexing}>
            {isIndexing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Indexing...
              </>
            ) : (
              'Start Indexing'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
