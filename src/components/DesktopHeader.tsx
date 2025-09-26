import { Clock, Wifi, Battery, Volume2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const DesktopHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <header className="h-12 bg-background/80 backdrop-blur-sm border-b border-border px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-lg font-bold text-primary">Hive OS</div>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-foreground">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" />
          <Volume2 className="h-4 w-4" />
          <Battery className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{formatTime(currentTime)}</span>
          <span className="text-muted-foreground">{formatDate(currentTime)}</span>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;