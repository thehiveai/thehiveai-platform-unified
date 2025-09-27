import { useState } from 'react';
import { FolderOpen, MessageSquare, ChevronRight, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Chat {
  id: string;
  title: string;
  messages: any;
  folder_id?: string;
  created_at: string;
  updated_at: string;
}

interface ChatFolder {
  id: string;
  name: string;
  parent_folder_id?: string;
  created_at: string;
  updated_at: string;
}

interface ChatOrganizerProps {
  chats: Chat[];
  folders: ChatFolder[];
  selectedItems: Set<string>;
  onItemSelection: (itemId: string, selected: boolean) => void;
  onMoveToFolder: (chatIds: string[], folderId: string | null) => Promise<void>;
  loading: boolean;
}

const ChatOrganizer = ({
  chats,
  folders,
  selectedItems,
  onItemSelection,
  onMoveToFolder,
  loading
}: ChatOrganizerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (draggedItem) {
      const chat = chats.find(c => c.id === draggedItem);
      if (chat) {
        await onMoveToFolder([draggedItem], folderId);
      }
      setDraggedItem(null);
    }
  };

  const renderFolder = (folder: ChatFolder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderChats = chats.filter(chat => chat.folder_id === folder.id);
    const childFolders = folders.filter(f => f.parent_folder_id === folder.id);

    return (
      <div key={folder.id} className={`ml-${level * 4}`}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-secondary/50 rounded-md cursor-pointer group"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <Checkbox
            checked={selectedItems.has(folder.id)}
            onCheckedChange={(checked) => onItemSelection(folder.id, !!checked)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{folder.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {folderChats.length} chats
          </span>
        </div>

        {isExpanded && (
          <div className="ml-8 space-y-1">
            {childFolders.map(childFolder => renderFolder(childFolder, level + 1))}
            {folderChats.map(chat => renderChat(chat, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderChat = (chat: Chat, level = 0) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    return (
      <div
        key={chat.id}
        className={`flex items-center gap-2 p-2 hover:bg-secondary/50 rounded-md cursor-pointer group ml-${level * 4}`}
        draggable
        onDragStart={(e) => handleDragStart(e, chat.id)}
      >
        <Checkbox
          checked={selectedItems.has(chat.id)}
          onCheckedChange={(checked) => onItemSelection(chat.id, !!checked)}
        />
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{chat.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(chat.updated_at)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {Array.isArray(chat.messages) ? chat.messages.length : 0} msgs
        </span>
      </div>
    );
  };

  // Get root folders and unorganized chats
  const rootFolders = folders.filter(f => !f.parent_folder_id);
  const unorganizedChats = chats.filter(chat => !chat.folder_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <ScrollArea className="h-full p-4">
        <div className="space-y-2">
          {/* Root folders */}
          {rootFolders.map(folder => renderFolder(folder))}
          
          {/* Unorganized chats */}
          {unorganizedChats.length > 0 && (
            <>
              <div className="text-sm font-medium text-muted-foreground py-2 border-t border-border mt-4">
                Unorganized Chats
              </div>
              <div
                className="space-y-1"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
              >
                {unorganizedChats.map(chat => renderChat(chat))}
              </div>
            </>
          )}

          {chats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No chats yet</p>
              <p className="text-sm">Start a conversation to see your chat history here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default ChatOrganizer;