import buddyBee from '../assets/buddy-bee-ref3.png';

const DesktopMain = () => {
  return (
    <main className="flex-1">
      <div className="h-full w-full flex items-center justify-center p-8">
        <div className="flex items-center gap-8">
          <div className="text-center text-foreground">
            <h2 className="text-4xl font-bold mb-4 text-primary">Welcome to the Hive AI Platform</h2>
            <p className="text-xl text-muted-foreground">Intelligence for Work & Play</p>
          </div>
          <div className="buddy-bee-animate">
            <img 
              src={buddyBee} 
              alt="Buddy Bee" 
              className="h-24 w-auto buddy-bee-wings object-contain"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default DesktopMain;