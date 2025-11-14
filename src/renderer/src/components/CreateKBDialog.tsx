import { useState } from 'react';

interface CreateKBDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export function CreateKBDialog({ isOpen, onClose, onCreate }: CreateKBDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreate(name, description);
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create KB:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="!text-neutral-300 bg-neutral-900 rounded-xl p-6 w-full max-w-md border border-neutral-700 !text-left caret-white">
        <h3 className="text-xl font-bold text-white mb-4 !text-center">Create Knowledge Base</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 !bg-neutral-700/50 border !border-neutral-600 rounded-lg !text-white !placeholder-neutral-400 focus:outline-none focus:!border-neutral-500"
              placeholder="e.g., Project Documentation"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-700/50 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-500 h-24 resize-none"
              placeholder="Describe what this knowledge base will contain..."
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-300 hover:text-white transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-neutral-500 hover:bg-neutral-600 rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={!name.trim() || !description.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}