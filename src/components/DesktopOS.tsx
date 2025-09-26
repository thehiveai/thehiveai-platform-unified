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

  useEffect(() => {
    localStorage.setItem('chatMode', chatMode);
  }, [chatMode]);

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
        {chatMode !== 'expanded' && <DesktopMain />}
      </div>
      <DesktopFooter />
    </div>
  );
};

export default DesktopOS;