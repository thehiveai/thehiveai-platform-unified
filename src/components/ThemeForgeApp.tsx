import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Palette, Wand2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ThemeForgeAppProps {
  onGeneratedImage?: (imageUrl: string) => void;
}

const ThemeForgeApp = ({ onGeneratedImage }: ThemeForgeAppProps) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a theme description');
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate AI image generation with Gemini nano banana
      // In a real implementation, this would call the Gemini API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For now, generate a placeholder image URL
      const mockImageUrl = `https://picsum.photos/1920/1080?random=${Date.now()}`;
      setGeneratedImage(mockImageUrl);
      onGeneratedImage?.(mockImageUrl);
      
      toast.success('Theme background generated successfully!');
    } catch (error) {
      toast.error('Failed to generate background');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyBackground = () => {
    if (!generatedImage) return;
    
    // Apply the background to the desktop
    document.body.style.backgroundImage = `url(${generatedImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    
    toast.success('Background applied to desktop!');
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `theme-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Theme saved to My AI Themes folder!');
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            AI Background Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="themePrompt">Describe your dream background</Label>
            <Textarea
              id="themePrompt"
              placeholder="e.g., A serene forest with golden sunlight filtering through ancient trees, mystical atmosphere with floating particles..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="mt-2"
            />
          </div>
          
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                Generating with Gemini...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Background
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedImage && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Background</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img 
                src={generatedImage} 
                alt="Generated background"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleApplyBackground}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Apply Background
              </Button>
              
              <Button 
                onClick={handleDownload}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Save to Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Popular Themes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2">
            {[
              "Cyberpunk neon cityscape with rain reflections",
              "Peaceful mountain lake at sunset with orange clouds",
              "Abstract geometric patterns in blue and purple gradients",
              "Tropical beach with palm trees and turquoise water",
              "Space nebula with colorful cosmic dust and stars"
            ].map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="text-left justify-start h-auto p-3 text-wrap"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThemeForgeApp;