import { Home, Search, Settings, Grid3X3, User, Cloud } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const DesktopFooter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const appCategories = [
    {
      name: 'Developer Tools',
      description: 'IDEs, frameworks, and development utilities',
      apps: ['Code Studio', 'Git Manager', 'API Tester', 'Database Explorer']
    },
    {
      name: 'Creative Suite',
      description: 'Design, video, audio, and creative applications',
      apps: ['Image Forge', 'Film Forge', 'Audio Workshop', 'Design Canvas']
    },
    {
      name: 'Productivity',
      description: 'Task management and productivity boosters',
      apps: ['Task Master', 'Note Keeper', 'Time Tracker', 'Focus Mode']
    },
    {
      name: 'Business Tools',
      description: 'CRM, accounting, and business management',
      apps: ['CRM Pro', 'Invoice Manager', 'Analytics Dashboard', 'Team Hub']
    },
    {
      name: 'Research & Data',
      description: 'Analytics, data science, and research tools',
      apps: ['Data Analyzer', 'Chart Builder', 'Research Assistant', 'Statistics Pro']
    },
    {
      name: 'Personalization',
      description: 'Themes, customization, and personal tools',
      apps: ['Theme Studio', 'Widget Creator', 'Custom Shortcuts', 'Profile Manager']
    }
  ];

  return (
    <footer className="h-16 bg-background/80 backdrop-blur-sm border-t border-border px-4 flex items-center justify-center">
      <div className="flex items-center gap-4">
        {/* Home Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
          title="Home"
        >
          <Home className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
        </button>

        {/* Search Button */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              title="Search"
            >
              <Search className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              {searchQuery && (
                <div className="text-sm text-muted-foreground">
                  Search functionality will be connected to backend soon.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Applications Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              title="Applications"
            >
              <Grid3X3 className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="center" side="top" sideOffset={8}>
            <DropdownMenuLabel>Application Categories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {appCategories.map((category, index) => (
              <DropdownMenuSub key={index}>
                <DropdownMenuSubTrigger>
                  <span className="font-medium">{category.name}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <div className="px-2 py-1 text-xs text-muted-foreground mb-1">
                    {category.description}
                  </div>
                  <DropdownMenuSeparator />
                  {category.apps.map((app, appIndex) => (
                    <DropdownMenuItem key={appIndex} className="cursor-pointer">
                      {app}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cloud Storage Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              title="Cloud Storage"
            >
              <Cloud className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="center" side="top" sideOffset={8}>
            <DropdownMenuLabel>Cloud Storage</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              OneDrive Personal
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              OneDrive Business
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Google Drive
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              Dropbox
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User Button */}
        <button
          onClick={() => navigate('/user')}
          className="flex items-center justify-center w-12 h-12 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
          title="ai.You"
        >
          <User className="h-6 w-6 text-foreground group-hover:text-primary transition-colors" />
        </button>
        
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