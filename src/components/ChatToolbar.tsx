import { useState } from 'react';
import { FolderPlus, Trash2, HelpCircle, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ChatToolbarProps {
  onCreateFolder: (name: string, parentId?: string) => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onBuddyHelp: () => Promise<void>;
  onSelectAll: () => void;
  selectedCount: number;
  selectAll: boolean;
  hasUnorganizedChats: boolean;
}

const ChatToolbar = ({
  onCreateFolder,
  onDeleteSelected,
  onBuddyHelp,
  onSelectAll,
  selectedCount,
  selectAll,
  hasUnorganizedChats
}: ChatToolbarProps) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    await onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setCreateFolderOpen(false);
  };

  return (
    <Card className="h-full rounded-none border-0 border-l">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Chat Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Folder */}
        <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <FolderPlus className="h-4 w-4" />
              Add Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folderName">Folder Name</Label>
                <Input
                  id="folderName"
                  placeholder="Enter folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                Create Folder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Selected */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              disabled={selectedCount === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedCount})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteSelected}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Buddy's Help */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={onBuddyHelp}
          disabled={!hasUnorganizedChats}
        >
          <HelpCircle className="h-4 w-4" />
          Buddy's Help
        </Button>

        {/* Select All */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={onSelectAll}
          disabled={!hasUnorganizedChats}
        >
          {selectAll ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          {selectAll ? 'Deselect All' : 'Select All'}
        </Button>

        {/* Info Panel */}
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-2">
            <p><strong>Tips:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Drag chats into folders to organize them</li>
              <li>Use Buddy's Help to auto-organize unorganized chats</li>
              <li>Folders can be nested for better organization</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatToolbar;