import { Clock, Bug, BookOpen, HelpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import hiveAILogo from '../assets/hive-ai-logo.png';

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
        <img src={hiveAILogo} alt="Hive AI" className="h-12 w-auto" />
      </div>
      
      <div className="flex items-center gap-4 text-sm text-foreground">
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:text-primary transition-colors">
                <Bug className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bug Report</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:text-primary transition-colors">
                <BookOpen className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Knowledge Base</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="hover:text-primary transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Get Help</p>
            </TooltipContent>
          </Tooltip>
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