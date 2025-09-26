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
      className="min-h-screen w-full flex"
      style={{ 
        backgroundImage: `url(${honeycombWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <ChatPanel 
        isExpanded={isChatExpanded} 
        onToggle={() => setIsChatExpanded(!isChatExpanded)} 
      />
      <div className="flex-1 flex flex-col">
        <DesktopHeader />
        <DesktopMain />
        <DesktopFooter />
      </div>
    </div>
  );
};

export default DesktopOS;