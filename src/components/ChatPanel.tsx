import { useState } from 'react';
import { Send, MessageSquare, Clock, ChevronLeft, ChevronRight, Maximize2, Minimize2, History, Brain, User, Settings, Paperclip, Type, Mic, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import HistorySidebar from './HistorySidebar';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

type ChatMode = 'collapsed' | 'expanded' | 'fullscreen';

interface ChatPanelProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const ChatPanel = ({ mode, onModeChange }: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Mock data for recent chats dropdown
  const recentChats = [
    'Web-based desktop OS',
    'React component design', 
    'Tailwind CSS setup',
    'TypeScript interfaces',
    'API integration help',
    'Database schema design',
    'Authentication flow',
    'State management',
    'Performance optimization',
    'UI component library'
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'We are going to build a web-based desktop operating system.',
      role: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: '2',
      content: 'I\'ll help you create a web-based desktop OS with header, footer, and full-screen desktop using your honeycomb wallpaper.',
      role: 'assistant',
      timestamp: new Date(Date.now() - 1000 * 60 * 4)
    },
    {
      id: '3',
      content: 'use this one instead',
      role: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 2)
    },
    {
      id: '4',
      content: 'Updated the wallpaper to the new honeycomb design with better gradient lighting effects.',
      role: 'assistant',
      timestamp: new Date(Date.now() - 1000 * 60 * 1)
    }
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        content: message,
        role: 'user',
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNextMode = (): ChatMode => {
    switch (mode) {
      case 'collapsed': return 'expanded';
      case 'expanded': return 'fullscreen';
      case 'fullscreen': return 'collapsed';
    }
  };

  const getWidthClass = () => {
    switch (mode) {
      case 'collapsed': return 'w-12';
      case 'expanded': return 'w-80';
      case 'fullscreen': return 'w-full';
    }
  };

  return (
    <div className={`${getWidthClass()} h-full bg-background/95 backdrop-blur-sm ${mode !== 'fullscreen' ? 'border-r border-border' : ''} flex flex-col transition-all duration-300 relative overflow-hidden`}>
      {/* Toggle Buttons */}
      <div className="absolute top-4 -right-3 z-50 flex flex-col gap-1">
        <Button
          onClick={() => onModeChange(getNextMode())}
          variant="ghost"
          size="icon"
          className="bg-background border border-border rounded-full shadow-md hover:bg-secondary"
          title={`Switch to ${getNextMode()} mode`}
        >
          {mode === 'collapsed' ? <ChevronRight className="h-4 w-4" /> : 
           mode === 'expanded' ? <Maximize2 className="h-4 w-4" /> : 
           <Minimize2 className="h-4 w-4" />}
        </Button>
      </div>

      {mode !== 'collapsed' ? (
        <>
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} 
                  title="Chat History"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                >
                  <History className="h-4 w-4" />
                  {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">History</span>}
                </Button>
                <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="AI Model Selector">
                  <Brain className="h-4 w-4" />
                  {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Model</span>}
                </Button>
                <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="Personality">
                  <User className="h-4 w-4" />
                  {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Personality</span>}
                </Button>
                <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="Settings">
                  <Settings className="h-4 w-4" />
                  {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Settings</span>}
                </Button>
              </div>
              {mode === 'fullscreen' && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  Fullscreen
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={msg.role === 'user' ? 'text-primary' : 'text-foreground'}>
                        {msg.role === 'user' ? 'You' : 'Hive AI'}
                      </span>
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(msg.timestamp)}</span>
                    </div>
                    <div className={`p-3 rounded-lg text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary/10 text-foreground ml-4' 
                        : 'bg-secondary text-foreground mr-4'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask Buddy Bee..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                onClick={handleSendMessage}
                size="icon"
                disabled={!message.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="Attach Files">
                <Paperclip className="h-4 w-4" />
                {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Attach</span>}
              </Button>
              <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="Text Input">
                <Type className="h-4 w-4" />
                {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Text</span>}
              </Button>
              <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="Voice Input">
                <Mic className="h-4 w-4" />
                {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Voice</span>}
              </Button>
              <Button variant="ghost" size={mode === 'expanded' || mode === 'fullscreen' ? 'sm' : 'icon'} title="Conversational Mode">
                <MessageCircle className="h-4 w-4" />
                {(mode === 'expanded' || mode === 'fullscreen') && <span className="ml-1">Chat</span>}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center pt-4 relative">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="mb-2" title="Chat History">
                <History className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Recent Chats
                </div>
                {recentChats.map((chatTitle, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-2"
                    onClick={() => {/* Handle chat selection */}}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate text-sm">{chatTitle}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
      )}

      {/* History Sidebar */}
      {(mode === 'expanded' || mode === 'fullscreen') && (
        <HistorySidebar 
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatPanel;