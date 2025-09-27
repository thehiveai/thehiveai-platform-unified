import buddyBee from '../assets/buddy-bee-ref3.png';
import RightMenuBar from './RightMenuBar';
import ThemeForgeApp from './ThemeForgeApp';
import ChatHistory from './ChatHistory';
import { Button } from '@/components/ui/button';
import { Palette, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface UserDesktopMainProps {
  selectedApp?: string | null;
  onAppClose?: () => void;
}

const UserDesktopMain = ({ selectedApp, onAppClose }: UserDesktopMainProps) => {
  const [showChatHistory, setShowChatHistory] = useState(false);
  console.log('UserDesktopMain render, selectedApp:', selectedApp);
  
  if (showChatHistory) {
    return <ChatHistory onClose={() => setShowChatHistory(false)} />;
  }
  
  return (
    <div className="flex-1 flex h-full">
      <main className="flex-1 flex flex-col">
        {selectedApp === 'ThemeForge' ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Theme Forge
              </h2>
              <Button variant="ghost" size="sm" onClick={onAppClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <ThemeForgeApp onGeneratedImage={(imageUrl) => {
                console.log('Generated image:', imageUrl);
                toast.success('Background generated! Check My AI Themes folder.');
              }} />
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center p-8">
            <div className="relative">
              <div className="text-center text-foreground">
                <h2 className="text-4xl font-bold mb-4 text-primary">Welcome to ai.You</h2>
                <p className="text-xl text-muted-foreground">Intelligence for Work & Play</p>
              </div>
              <div className="absolute top-0 left-1/2 transform translate-x-64 -translate-y-12">
                <img 
                  src={buddyBee} 
                  alt="Buddy Bee" 
                  className="h-24 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        )}
      </main>
      <RightMenuBar onShowChatHistory={() => setShowChatHistory(true)} />
    </div>
  );
};

export default UserDesktopMain;