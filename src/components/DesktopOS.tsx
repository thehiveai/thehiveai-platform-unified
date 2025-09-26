import honeycombWallpaper from '../assets/honeycomb-wallpaper.png';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';
import DesktopMain from './DesktopMain';

const DesktopOS = () => {
  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${honeycombWallpaper})` }}
    >
      <DesktopHeader />
      <DesktopMain />
      <DesktopFooter />
    </div>
  );
};

export default DesktopOS;