import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-hive-dark/90 backdrop-blur-md border-b border-hive-amber/20">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <span className="text-hive-dark font-bold text-lg">🐝</span>
            </div>
            <span className="text-xl font-bold text-hive-gold">
              the Hive Store
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-hive-gold/70 hover:text-hive-gold transition-colors">
              Features
            </a>
            <a href="#categories" className="text-hive-gold/70 hover:text-hive-gold transition-colors">
              Categories
            </a>
            <a href="#plans" className="text-hive-gold/70 hover:text-hive-gold transition-colors">
              Plans
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-hive-gold/70 hover:text-hive-gold">
              Sign In
            </Button>
            <Button className="bg-gradient-primary hover:opacity-90 text-hive-dark border-0 shadow-glow">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;