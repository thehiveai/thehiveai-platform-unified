const Footer = () => {
  return (
    <footer className="bg-hive-surface/80 border-t border-hive-amber/20 py-12 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <span className="text-hive-dark font-bold text-lg">🐝</span>
            </div>
            <span className="text-xl font-bold text-hive-gold">
              the Hive Store
            </span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-hive-gold/60">
            <a href="#" className="hover:text-hive-gold transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-hive-gold transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-hive-gold transition-colors">
              Support
            </a>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-hive-amber/20 text-center">
          <p className="text-hive-gold/60">
            🐝 © 2024 the Hive Store. All rights reserved. Your early support is the honey that powers the Hive—thank you!
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;