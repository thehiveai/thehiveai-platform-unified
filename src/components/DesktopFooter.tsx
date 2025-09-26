import { Home, Search, Settings, Grid3X3, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const DesktopFooter = () => {
  const taskbarItems = [
    { icon: Home, label: 'Home' },
    { icon: Search, label: 'Search' },
    { icon: Grid3X3, label: 'Apps' },
    { icon: Users, label: 'Users' },
  ];

  return (
    <footer className="h-16 bg-background/80 backdrop-blur-sm border-t border-border px-4 flex items-center justify-center">
      <div className="flex items-center gap-2">
        {taskbarItems.map((item, index) => (
          <button
            key={index}
            className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
            title={item.label}
          >
            <item.icon className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
        
        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              title="Settings"
            >
              <Settings className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="center" side="top" sideOffset={8}>
            <DropdownMenuLabel>Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuItem>Theme</DropdownMenuItem>
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
            <DropdownMenuItem>Notifications</DropdownMenuItem>
            <DropdownMenuItem>Privacy & Security</DropdownMenuItem>
            <DropdownMenuItem>System Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>About</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </footer>
  );
};

export default DesktopFooter;