import { useState } from 'react';
import { FolderOpen, File, Image, Music, Video, Plus, Upload, Download, Trash2, Play, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  icon: any;
  children?: FileItem[];
  size?: string;
  dateModified?: string;
  fileType?: 'image' | 'video' | 'audio' | 'document' | 'other';
}

interface RightMenuBarProps {
  onShowChatHistory?: () => void;
}

const RightMenuBar = ({ onShowChatHistory }: RightMenuBarProps) => {
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileStructure, setFileStructure] = useState<FileItem[]>([
    {
      id: 'documents',
      name: 'My Documents',
      type: 'folder',
      icon: FolderOpen,
      children: []
    },
    {
      id: 'pictures',
      name: 'My Pictures',
      type: 'folder',
      icon: Image,
      children: [
        {
          id: 'ai-themes',
          name: 'My AI Themes',
          type: 'folder',
          icon: FolderOpen,
          children: []
        }
      ]
    },
    {
      id: 'videos',
      name: 'My Videos',
      type: 'folder',
      icon: Video,
      children: []
    },
    {
      id: 'audio',
      name: 'My Audio',
      type: 'folder',
      icon: Music,
      children: []
    }
  ]);

  const handleFileClick = (item: FileItem) => {
    if (item.type === 'file') {
      setSelectedFile(item);
    }
  };

  const handleFileAction = (action: 'download' | 'delete' | 'view', file: FileItem) => {
    switch (action) {
      case 'download':
        toast.success(`Downloading ${file.name}`);
        break;
      case 'delete':
        toast.success(`${file.name} deleted`);
        break;
      case 'view':
        toast.success(`Opening ${file.name}`);
        break;
    }
  };

  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} className={`ml-${level * 4}`}>
        <div 
          className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-md cursor-pointer group"
          onClick={() => handleFileClick(item)}
        >
          <div className="flex items-center gap-2">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{item.name}</span>
          </div>
          {item.type === 'file' && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileAction('view', item);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileAction('download', item);
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileAction('delete', item);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {item.children && item.children.length > 0 && (
          <div className="ml-4">
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };


  return (
    <div className="w-80 bg-background/95 backdrop-blur-sm border-l border-border flex flex-col">
      {/* Menu Bar */}
      <div className="p-4 border-b border-border space-y-2">
        <Button
          variant={isFilesOpen ? "default" : "outline"}
          onClick={() => setIsFilesOpen(!isFilesOpen)}
          className="w-full justify-start gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          My Files
        </Button>
        <Button
          variant="outline"
          onClick={onShowChatHistory}
          className="w-full justify-start gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          My Chats
        </Button>
      </div>

      {/* File Explorer */}
      {isFilesOpen && (
        <div className="flex-1 p-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                File Explorer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderFileTree(fileStructure)}
              
              <div className="pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Plus className="h-4 w-4 mr-1" />
                        New Folder
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="folderName">Folder Name</Label>
                          <Input id="folderName" placeholder="Enter folder name" />
                        </div>
                        <Button className="w-full">Create Folder</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Files</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fileUpload">Select Files</Label>
                          <Input id="fileUpload" type="file" multiple />
                        </div>
                        <Button className="w-full">Upload Files</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RightMenuBar;