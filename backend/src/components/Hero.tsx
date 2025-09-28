import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const Hero = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testServiceRole = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-service-role', {
        body: {}
      });

      if (error) {
        console.error('Error calling test function:', error);
        setTestResult({ valid: false, error: error.message });
      } else {
        console.log('Test result:', data);
        setTestResult(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setTestResult({ valid: false, error: 'Unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-hive">
      <div className="absolute inset-0 bg-hive-dark/60"></div>
      
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-hive-surface/80 border border-hive-amber/30 mb-8 shadow-hive">
            <Sparkles className="w-4 h-4 text-hive-amber mr-2" />
            <span className="text-sm text-hive-gold">
              🐝 Powered by Advanced AI Technology
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-hive-gold">
            Discover AI Solutions{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Built for Work and Play
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-hive-gold/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            <span className="text-hive-amber font-semibold">Hive Store</span> offer AI solutions, <em className="text-hive-gold">powered by</em> Hive OS. 
            Every app runs on Universal AI tokens—simple to budget, effortless to control.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 text-hive-dark border-0 px-8 py-6 text-lg group shadow-glow font-semibold"
            >
              ⚡ Hive OS Plans
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-hive-amber/30 hover:bg-hive-surface/50 text-hive-gold px-8 py-6 text-lg"
            >
              View Categories
            </Button>
          </div>

          {/* Service Role Test Section */}
          <div className="mt-12 p-6 rounded-lg bg-hive-surface/30 border border-hive-amber/20">
            <h3 className="text-lg font-semibold text-hive-gold mb-4">Test Supabase Service Role</h3>
            <Button 
              onClick={testServiceRole}
              disabled={isLoading}
              size="lg"
              variant="outline"
              className="border-hive-amber/50 hover:bg-hive-amber/10 text-hive-gold mb-4"
            >
              <Shield className="mr-2 h-4 w-4" />
              {isLoading ? 'Testing...' : 'Test Service Role Key'}
            </Button>
            
            {testResult && (
              <div className={`mt-4 p-4 rounded-lg border ${
                testResult.valid 
                  ? 'bg-green-900/20 border-green-500/30 text-green-300' 
                  : 'bg-red-900/20 border-red-500/30 text-red-300'
              }`}>
                <h4 className="font-semibold mb-2">
                  {testResult.valid ? '✅ Service Role Key Valid' : '❌ Service Role Key Invalid'}
                </h4>
                {testResult.message && <p className="text-sm mb-2">{testResult.message}</p>}
                {testResult.error && <p className="text-sm mb-2">Error: {testResult.error}</p>}
                {testResult.testTimestamp && (
                  <p className="text-xs opacity-70">Tested at: {new Date(testResult.testTimestamp).toLocaleString()}</p>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs opacity-70">Full Response</summary>
                  <pre className="text-xs mt-2 p-2 bg-black/30 rounded overflow-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-hive-dark to-transparent"></div>
    </section>
  );
};

export default Hero;