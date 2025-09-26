import buddyBee from '../assets/buddy-bee-ref3.png';

const DesktopMain = () => {
  return (
    <main className="flex-1">
      <div className="h-full w-full flex items-center justify-center p-8">
        <div className="relative">
          <div className="text-center text-foreground">
            <h2 className="text-4xl font-bold mb-4 text-primary">Welcome to the Hive AI Platform</h2>
            <p className="text-xl text-muted-foreground">Intelligence for Work & Play</p>
          </div>
          <div className="absolute top-0 left-1/2 transform translate-x-64 -translate-y-12">
            <img 
              src={buddyBee} 
              alt="Buddy Bee" 
              className="h-24 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default DesktopMain;