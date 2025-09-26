import { useState } from 'react';
import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import DesktopMain from './DesktopMain';
import ChatPanel from './ChatPanel';

type ChatMode = 'collapsed' | 'standard' | 'expanded';

const DesktopOS = () => {
  const [chatMode, setChatMode] = useState<ChatMode>('expanded');

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
        {chatMode === 'expanded' ? (
          <>
            <DesktopMain />
            <ChatPanel 
              mode={chatMode}
              onModeChange={setChatMode}
            />
          </>
        ) : (
          <>
            <ChatPanel 
              mode={chatMode}
              onModeChange={setChatMode}
            />
            <DesktopMain />
          </>
        )}
      </div>
      <DesktopFooter />
    </div>
  );
};

export default DesktopOS;