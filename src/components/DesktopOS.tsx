import { useState, useEffect } from 'react';
import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import DesktopMain from './DesktopMain';
import ChatPanel from './ChatPanel';

type ChatMode = 'collapsed' | 'standard' | 'expanded';

const DesktopOS = () => {
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    const savedPreference = localStorage.getItem('chatMode') as ChatMode;
    return savedPreference || 'standard';
  });
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('chatMode', chatMode);
  }, [chatMode]);

  useEffect(() => {
    const handleLaunchApp = (event: CustomEvent) => {
      console.log('Received launchApp event:', event.detail);
      setSelectedApp(event.detail);
    };

    window.addEventListener('launchApp', handleLaunchApp as EventListener);
    
    return () => {
      window.removeEventListener('launchApp', handleLaunchApp as EventListener);
    };
  }, []);

  const handleAppSelect = (appName: string) => {
    console.log('handleAppSelect called with:', appName);
    setSelectedApp(appName);
  };

  const handleAppClose = () => {
    setSelectedApp(null);
  };

  return (
    <div 
      className="h-screen w-full flex flex-col"
      style={{ 
        backgroundImage: `url(${honeycombWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <DesktopHeader />
      <div className="flex-1 flex">
        <ChatPanel 
          mode={chatMode}
          onModeChange={setChatMode}
        />
        {chatMode !== 'expanded' && (
          <DesktopMain 
            selectedApp={selectedApp}
            onAppClose={handleAppClose}
          />
        )}
      </div>
      <DesktopFooter onAppSelect={handleAppSelect} />
    </div>
  );
};

export default DesktopOS;