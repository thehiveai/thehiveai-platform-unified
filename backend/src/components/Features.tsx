import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Users, Zap, Shield, Globe, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Universal Token Economy",
    description: "Simple to budget, effortless to control with Universal AI tokens across all applications.",
  },
  {
    icon: Users,
    title: "Multi-Model AI Connections",
    description: "Access GPT-4, Claude, Gemini, and more AI models from a single unified interface.",
  },
  {
    icon: Zap,
    title: "Multi-App & Data Connections",
    description: "Seamlessly integrate across multiple applications and data sources in your workflow.",
  },
  {
    icon: Shield,
    title: "The Hive Context Engine",
    description: "Intelligent context awareness that understands your work patterns and preferences.",
  },
  {
    icon: Globe,
    title: "Natural Language Interface",
    description: "Interact with AI using natural language - no complex commands or syntax required.",
  },
  {
    icon: BarChart3,
    title: "Secure",
    description: "Enterprise-grade security with bank-level encryption protecting all your data and interactions.",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-hive-dark/40 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-hive-gold">
            ✨ The Future of{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              AI Applications
            </span>{" "}
            ✨
          </h2>
          <p className="text-xl text-hive-gold/80 max-w-3xl mx-auto">
            Powered by Hive OS, our AI operating system delivers the complete toolkit 
            for work and play with universal tokens and seamless integration.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-hive-surface/60 border-hive-amber/20 hover:bg-hive-surface/80 transition-all duration-300 hover:shadow-hive group backdrop-blur-sm"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 group-hover:shadow-glow transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-hive-dark" />
                </div>
                <CardTitle className="text-xl font-semibold text-hive-gold">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-hive-gold/70 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;