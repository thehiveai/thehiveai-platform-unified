import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Clock, ChevronLeft, ChevronRight, Maximize2, Minimize2, History, Brain, User, Settings, Paperclip, Type, Mic, MessageCircle, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import HistorySidebar from './HistorySidebar';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

type ChatMode = 'collapsed' | 'standard' | 'expanded' | 'fullscreen';

interface ChatPanelProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

const ChatPanel = ({ mode, onModeChange }: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isModelToolbarOpen, setIsModelToolbarOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Reset state when switching to collapsed or standard mode
  useEffect(() => {
    if (mode === 'collapsed' || mode === 'standard') {
      setIsHistoryOpen(false);
      setIsModelToolbarOpen(false);
    }
  }, [mode]);
  
  // Mock data for model providers and models
  const modelProviders = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'google', name: 'Google' },
    { id: 'meta', name: 'Meta' }
  ];

  const modelsByProvider = {
    openai: [
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { id: 'claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }
    ],
    google: [
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'palm-2', name: 'PaLM 2' }
    ],
    meta: [
      { id: 'llama-2-70b', name: 'Llama 2 70B' },
      { id: 'llama-2-13b', name: 'Llama 2 13B' }
    ]
  };
  
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
      case 'collapsed': return 'standard';
      case 'standard': return 'expanded';
      case 'expanded': return 'fullscreen';
      case 'fullscreen': return 'collapsed';
    }
  };

  const getWidthClass = () => {
    switch (mode) {
      case 'collapsed': return 'w-12';
      case 'standard': return 'w-64';
      case 'expanded': return 'w-80';
      case 'fullscreen': return 'w-full';
    }
  };

  return (
    <div className={`${getWidthClass()} h-full bg-background/95 backdrop-blur-sm ${mode !== 'fullscreen' ? 'border-r border-border' : ''} flex transition-all duration-300 relative overflow-hidden`}>
      {/* History Sidebar - Only in expanded/fullscreen mode when history is open */}
      {(mode === 'expanded' || mode === 'fullscreen') && isHistoryOpen && (
        <div className="w-64 h-full bg-background border-r border-border flex flex-col flex-shrink-0">
          <HistorySidebar 
            isOpen={true}
            onClose={() => setIsHistoryOpen(false)}
          />
        </div>
      )}

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

        {mode === 'collapsed' ? (
          /* Collapsed Mode - Only icon dropdowns */
          <div className="flex flex-col items-center pt-4 gap-2 h-full">
            {/* Chat History Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Chat History">
                  <History className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start" side="right" sideOffset={8}>
                <DropdownMenuLabel>Recent Chats</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentChats.slice(0, 10).map((chatTitle, index) => (
                  <DropdownMenuItem key={index}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <span className="truncate">{chatTitle}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Model Selection Dropdown with Flyouts */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="AI Model Selector">
                  <Brain className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="right" sideOffset={8}>
                <DropdownMenuLabel>Model Provider</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {modelProviders.map((provider) => (
                  <DropdownMenuSub key={provider.id}>
                    <DropdownMenuSubTrigger>
                      <span>{provider.name}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel>{provider.name} Models</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {modelsByProvider[provider.id as keyof typeof modelsByProvider]?.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => {
                            setSelectedProvider(provider.id);
                            setSelectedModel(model.id);
                          }}
                        >
                          {model.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Personality Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Personality">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="start" side="right" sideOffset={8}>
                <DropdownMenuLabel>AI Personality</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Professional</DropdownMenuItem>
                <DropdownMenuItem>Creative</DropdownMenuItem>
                <DropdownMenuItem>Casual</DropdownMenuItem>
                <DropdownMenuItem>Technical</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="start" side="right" sideOffset={8}>
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Preferences</DropdownMenuItem>
                <DropdownMenuItem>Theme</DropdownMenuItem>
                <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
                <DropdownMenuItem>About</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex-1 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
          </div>
        ) : mode === 'standard' ? (
          /* Standard Mode - Icon-only toolbar like collapsed but with full layout */
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    title="History"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsModelToolbarOpen(!isModelToolbarOpen)}
                    title="Model"
                  >
                    <Brain className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Personality">
                    <User className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Model Selection Toolbar */}
            {isModelToolbarOpen && (
              <div className="border-b border-border bg-background/50 backdrop-blur-sm transition-all duration-300">
                <div className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Select 
                      value={selectedModel} 
                      onValueChange={setSelectedModel}
                      disabled={!selectedProvider}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProvider && modelsByProvider[selectedProvider as keyof typeof modelsByProvider]?.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

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

            {/* Bottom Toolbar - Icon only */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-center gap-2">
                <Button variant="default" size="icon" title="New Chat" className="bg-primary">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Attach Files">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Text Input">
                  <Type className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Voice Input">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Conversational Mode">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Expanded/Fullscreen Mode - Full UI */
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    History
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsModelToolbarOpen(!isModelToolbarOpen)}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Model
                    <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isModelToolbarOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Personality
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>

                {mode === 'fullscreen' && (
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    Fullscreen
                  </span>
                )}
              </div>
            </div>

            {/* Model Selection Toolbar */}
            {isModelToolbarOpen && (
              <div className="border-b border-border bg-background/50 backdrop-blur-sm transition-all duration-300">
                <div className="p-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Model Provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Select 
                      value={selectedModel} 
                      onValueChange={setSelectedModel}
                      disabled={!selectedProvider}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="AI Model" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProvider && modelsByProvider[selectedProvider as keyof typeof modelsByProvider]?.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

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
                <Button variant="default" size="sm" title="New Chat" className="bg-primary">
                  <Plus className="h-4 w-4" />
                  <span className="ml-1">New Chat</span>
                </Button>
                <Button variant="ghost" size="sm" title="Attach Files">
                  <Paperclip className="h-4 w-4" />
                  <span className="ml-1">Attach</span>
                </Button>
                <Button variant="ghost" size="sm" title="Text Input">
                  <Type className="h-4 w-4" />
                  <span className="ml-1">Text</span>
                </Button>
                <Button variant="ghost" size="sm" title="Voice Input">
                  <Mic className="h-4 w-4" />
                  <span className="ml-1">Voice</span>
                </Button>
                <Button variant="ghost" size="sm" title="Conversational Mode">
                  <MessageCircle className="h-4 w-4" />
                  <span className="ml-1">Chat</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;