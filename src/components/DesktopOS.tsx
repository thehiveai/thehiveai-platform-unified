import { useState } from 'react';
import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import DesktopMain from './DesktopMain';
import ChatPanel from './ChatPanel';

const DesktopOS = () => {
  const [isChatExpanded, setIsChatExpanded] = useState(true);

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
          isExpanded={isChatExpanded} 
          onToggle={() => setIsChatExpanded(!isChatExpanded)} 
        />
        <DesktopMain />
      </div>
      <DesktopFooter />
    </div>
  );
};

export default DesktopOS;