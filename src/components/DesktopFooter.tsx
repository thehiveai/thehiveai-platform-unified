import { Home, Search, Grid3X3, Users } from 'lucide-react';

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
      </div>
    </footer>
  );
};

export default DesktopFooter;