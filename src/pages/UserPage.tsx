import { useState, useEffect } from 'react';
import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from '../components/DesktopHeader';
import DesktopFooter from '../components/DesktopFooter';
import UserDesktopMain from '../components/UserDesktopMain';
import ChatPanel from '../components/ChatPanel';

type ChatMode = 'collapsed' | 'standard' | 'expanded';

const UserPage = () => {
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    const savedPreference = localStorage.getItem('chatMode') as ChatMode;
    return savedPreference || 'standard';
  });
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('chatMode', chatMode);
  }, [chatMode]);

  const handleAppSelect = (appName: string) => {
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
          <UserDesktopMain 
            selectedApp={selectedApp}
            onAppClose={handleAppClose}
          />
        )}
      </div>
      <DesktopFooter onAppSelect={handleAppSelect} />
    </div>
  );
};

export default UserPage;