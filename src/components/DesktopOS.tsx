import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import DesktopMain from './DesktopMain';
import ChatPanel from './ChatPanel';

const DesktopOS = () => {
  return (
    <div 
      className="min-h-screen w-full flex flex-col"
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
        <ChatPanel />
        <div className="flex-1 flex flex-col">
          <DesktopMain />
        </div>
      </div>
      <DesktopFooter />
    </div>
  );
};

export default DesktopOS;