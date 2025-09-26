import { useState } from 'react';
import { Plus, Search, MessageSquare, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ChatHistory {
  id: string;
  title: string;
  category: string;
  timestamp: Date;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistorySidebar = ({ isOpen, onClose }: HistorySidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for chat history
  const chatHistory: ChatHistory[] = [
    { id: '1', title: 'Web-based desktop OS', category: 'Today', timestamp: new Date() },
    { id: '2', title: 'React component design', category: 'Today', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { id: '3', title: 'Tailwind CSS setup', category: 'Today', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
    { id: '4', title: 'TypeScript interfaces', category: 'Yesterday', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    { id: '5', title: 'API integration help', category: 'Yesterday', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25) },
    { id: '6', title: 'Database schema design', category: 'Yesterday', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26) },
    { id: '7', title: 'Authentication flow', category: 'Previous 7 days', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
    { id: '8', title: 'State management', category: 'Previous 7 days', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
    { id: '9', title: 'Performance optimization', category: 'Previous 7 days', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
    { id: '10', title: 'UI component library', category: 'Previous 30 days', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15) },
  ];

  const filteredHistory = chatHistory.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedHistory = filteredHistory.reduce((groups, chat) => {
    const category = chat.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(chat);
    return groups;
  }, {} as Record<string, ChatHistory[]>);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Chat History</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedHistory).map(([category, chats]) => (
            <div key={category} className="mb-4">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {category}
              </div>
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="group flex items-center justify-between p-2 rounded-md hover:bg-secondary cursor-pointer"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{chat.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {category !== Object.keys(groupedHistory)[Object.keys(groupedHistory).length - 1] && (
                <Separator className="my-3" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HistorySidebar;