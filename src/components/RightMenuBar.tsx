import { useState } from 'react';
import { FolderOpen, File, Image, Music, Video, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeForgeApp from './ThemeForgeApp';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  icon: any;
  children?: FileItem[];
}

const RightMenuBar = () => {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
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

  const renderFileTree = (items: FileItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} className={`ml-${level * 4}`}>
        <div className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded-md cursor-pointer">
          <item.icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{item.name}</span>
        </div>
        {item.children && item.children.length > 0 && (
          <div className="ml-4">
            {renderFileTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const handleAppSelect = (appName: string) => {
    setSelectedApp(appName);
  };

  const closeApp = () => {
    setSelectedApp(null);
  };

  return (
    <div className="w-80 bg-background/95 backdrop-blur-sm border-l border-border flex flex-col">
      {/* Menu Bar */}
      <div className="p-4 border-b border-border">
        <Button
          variant={isFilesOpen ? "default" : "outline"}
          onClick={() => setIsFilesOpen(!isFilesOpen)}
          className="w-full justify-start gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          My Files
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
              
              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAppSelect('ThemeForge')}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Theme Forge
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* App Workspace */}
      {selectedApp === 'ThemeForge' && (
        <div className="absolute inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Theme Forge</h2>
              <Button variant="ghost" size="sm" onClick={closeApp}>
                ×
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ThemeForgeApp onGeneratedImage={(imageUrl) => {
                // Here we would save the generated image to My AI Themes folder
                console.log('Generated image:', imageUrl);
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightMenuBar;