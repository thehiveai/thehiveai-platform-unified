import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import DesktopMain from './DesktopMain';

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
      <DesktopMain />
      <DesktopFooter />
    </div>
  );
};

export default DesktopOS;