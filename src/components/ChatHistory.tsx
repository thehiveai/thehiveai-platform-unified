import { useState, useEffect } from 'react';
import { X, FolderPlus, Trash2, HelpCircle, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import ChatOrganizer from './ChatOrganizer';
import ChatToolbar from './ChatToolbar';
import { toast } from 'sonner';

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

interface ChatHistoryProps {
  onClose: () => void;
}

const ChatHistory = ({ onClose }: ChatHistoryProps) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchChatsAndFolders();
  }, []);

  const fetchChatsAndFolders = async () => {
    try {
      setLoading(true);
      
      // Fetch chats
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (chatsError) throw chatsError;

      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('chat_folders')
        .select('*')
        .order('name');

      if (foldersError) throw foldersError;

      setChats(chatsData || []);
      setFolders(foldersData || []);
    } catch (error) {
      console.error('Error fetching chats and folders:', error);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name: string, parentId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('chat_folders')
        .insert({
          name,
          parent_folder_id: parentId,
          user_id: user.id
        });

      if (error) throw error;
      
      await fetchChatsAndFolders();
      toast.success('Folder created successfully');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    try {
      const selectedChats = Array.from(selectedItems).filter(id => 
        chats.some(chat => chat.id === id)
      );
      const selectedFolders = Array.from(selectedItems).filter(id => 
        folders.some(folder => folder.id === id)
      );

      // Delete chats
      if (selectedChats.length > 0) {
        const { error: chatsError } = await supabase
          .from('chats')
          .delete()
          .in('id', selectedChats);

        if (chatsError) throw chatsError;
      }

      // Delete folders
      if (selectedFolders.length > 0) {
        const { error: foldersError } = await supabase
          .from('chat_folders')
          .delete()
          .in('id', selectedFolders);

        if (foldersError) throw foldersError;
      }

      setSelectedItems(new Set());
      await fetchChatsAndFolders();
      toast.success('Items deleted successfully');
    } catch (error) {
      console.error('Error deleting items:', error);
      toast.error('Failed to delete items');
    }
  };

  const handleBuddyHelp = async () => {
    const unorganizedChats = chats.filter(chat => !chat.folder_id);
    
    if (unorganizedChats.length === 0) {
      toast.info('No unorganized chats to organize');
      return;
    }

    try {
      // Call edge function for AI organization recommendations
      const { data, error } = await supabase.functions.invoke('buddy-organize-chats', {
        body: { chats: unorganizedChats }
      });

      if (error) throw error;

      // Show recommendations in a dialog or toast
      toast.success('Buddy analyzed your chats! Check the recommendations.');
      // TODO: Show recommendations dialog
    } catch (error) {
      console.error('Error getting Buddy help:', error);
      toast.error('Buddy is having trouble right now. Please try again later.');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      const unorganizedChatIds = chats
        .filter(chat => !chat.folder_id)
        .map(chat => chat.id);
      setSelectedItems(new Set(unorganizedChatIds));
    }
    setSelectAll(!selectAll);
  };

  const handleItemSelection = (itemId: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleMoveToFolder = async (chatIds: string[], folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ folder_id: folderId })
        .in('id', chatIds);

      if (error) throw error;
      
      await fetchChatsAndFolders();
      toast.success('Chats moved successfully');
    } catch (error) {
      console.error('Error moving chats:', error);
      toast.error('Failed to move chats');
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Transparent Navigation Bar */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border/50 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Chat History</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Organizer */}
        <div className="flex-1 p-4">
          <ChatOrganizer
            chats={chats}
            folders={folders}
            selectedItems={selectedItems}
            onItemSelection={handleItemSelection}
            onMoveToFolder={handleMoveToFolder}
            loading={loading}
          />
        </div>

        {/* Toolbar */}
        <div className="w-64 border-l border-border">
          <ChatToolbar
            onCreateFolder={handleCreateFolder}
            onDeleteSelected={handleDeleteSelected}
            onBuddyHelp={handleBuddyHelp}
            onSelectAll={handleSelectAll}
            selectedCount={selectedItems.size}
            selectAll={selectAll}
            hasUnorganizedChats={chats.some(chat => !chat.folder_id)}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;