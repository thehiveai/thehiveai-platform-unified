import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Palette, 
  Wand2, 
  Download, 
  Eye, 
  Check, 
  X, 
  FolderOpen,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ThemeBrowser from './ThemeBrowser';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ThemeForgeAppProps {
  onGeneratedImage?: (imageUrl: string) => void;
}

interface ThemeImage {
  id: string;
  title: string;
  prompt: string;
  image_url: string;
  image_data?: string;
  status: 'generated' | 'applied' | 'rejected';
  created_at: string;
}

const ThemeForgeApp = ({ onGeneratedImage }: ThemeForgeAppProps) => {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState<ThemeImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || !title.trim()) {
      toast.error('Please enter both a title and theme description');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Generating theme image...');
      
      // Call edge function for AI image generation
      const { data, error } = await supabase.functions.invoke('generate-theme-image', {
        body: { 
          prompt: prompt.trim(), 
          title: title.trim() 
        }
      });

      if (error) throw error;

      if (data.filtered) {
        toast.error(data.error);
        return;
      }

      if (!data.success || !data.image_url) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: savedTheme, error: saveError } = await supabase
        .from('theme_images')
        .insert({
          user_id: user.id,
          title: title.trim(),
          prompt: prompt.trim(),
          image_url: data.image_url,
          image_data: data.image_data,
          status: 'generated'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setGeneratedImage(data.image_url);
      setCurrentTheme({
        ...savedTheme,
        status: savedTheme.status as 'generated' | 'applied' | 'rejected'
      });
      onGeneratedImage?.(data.image_url);
      
      toast.success('Theme background generated successfully!');
    } catch (error) {
      console.error('Error generating theme:', error);
      toast.error((error as Error).message || 'Failed to generate background');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyTheme = async () => {
    if (!currentTheme) return;
    
    try {
      // Update status to applied
      const { error } = await supabase
        .from('theme_images')
        .update({ status: 'applied' })
        .eq('id', currentTheme.id);

      if (error) throw error;

      // Apply the background to the desktop
      document.body.style.backgroundImage = `url(${currentTheme.image_url})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      
      setCurrentTheme({ ...currentTheme, status: 'applied' });
      toast.success('Theme applied to desktop!');
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error('Failed to apply theme');
    }
  };

  const handleRejectTheme = async () => {
    if (!currentTheme) return;
    
    try {
      // Update status to rejected
      const { error } = await supabase
        .from('theme_images')
        .update({ status: 'rejected' })
        .eq('id', currentTheme.id);

      if (error) throw error;

      setCurrentTheme({ ...currentTheme, status: 'rejected' });
      setGeneratedImage('');
      setCurrentTheme(null);
      toast.success('Theme rejected and moved to archive');
      setShowRejectDialog(false);
    } catch (error) {
      console.error('Error rejecting theme:', error);
      toast.error('Failed to reject theme');
    }
  };

  const handleSelectFromBrowser = (theme: ThemeImage) => {
    setGeneratedImage(theme.image_url);
    setCurrentTheme(theme);
    setTitle(theme.title);
    setPrompt(theme.prompt);
    setShowBrowser(false);
    onGeneratedImage?.(theme.image_url);
    toast.success('Theme loaded from gallery');
  };

  const handleDownload = () => {
    if (!currentTheme) return;
    
    const link = document.createElement('a');
    link.href = currentTheme.image_url;
    link.download = `${currentTheme.title.replace(/\s+/g, '_')}_${currentTheme.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Theme downloaded successfully!');
  };

  if (showBrowser) {
    return (
      <ThemeBrowser 
        onClose={() => setShowBrowser(false)}
        onSelectTheme={handleSelectFromBrowser}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 flex flex-col gap-6">
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                AI Theme Generator
                <Sparkles className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="themeTitle">Theme Title</Label>
                <Input
                  id="themeTitle"
                  placeholder="e.g., Mystical Forest, Neon Cityscape, Abstract Art..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label htmlFor="themePrompt">Describe your dream background</Label>
                <Textarea
                  id="themePrompt"
                  placeholder="e.g., A serene forest with golden sunlight filtering through ancient trees, mystical atmosphere with floating particles..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !prompt.trim() || !title.trim()}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Theme
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowBrowser(true)}
                  className="flex-shrink-0"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Browse My Themes
                </Button>
              </div>

              {/* Content Policy Notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Content Policy</p>
                  <p>All generated content is filtered for safety. Please use family-friendly descriptions only.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {generatedImage && currentTheme && (
            <Card className="flex-1 min-h-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{currentTheme.title}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    currentTheme.status === 'applied' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : currentTheme.status === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {currentTheme.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 h-full flex flex-col">
                <div className="flex-1 rounded-lg overflow-hidden bg-muted min-h-0">
                  <img 
                    src={generatedImage} 
                    alt={currentTheme.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    onClick={handleApplyTheme}
                    className="flex-1"
                    disabled={currentTheme.status === 'applied'}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {currentTheme.status === 'applied' ? 'Applied' : 'Apply Theme'}
                  </Button>
                  
                  <Button 
                    onClick={() => setShowRejectDialog(true)}
                    variant="outline"
                    className="flex-1 text-destructive hover:text-destructive"
                    disabled={currentTheme.status === 'rejected'}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  
                  <Button 
                    onClick={handleDownload}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="w-80 flex-shrink-0">
          <Card className="h-full">
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
                  "Space nebula with colorful cosmic dust and stars",
                  "Minimalist zen garden with bamboo and stones",
                  "Fantasy castle floating in clouds with aurora",
                  "Autumn forest path with golden falling leaves"
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="text-left justify-start h-auto p-3 text-wrap"
                    onClick={() => {
                      setPrompt(suggestion);
                      setTitle(suggestion.split(' ').slice(0, 3).join(' '));
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this theme?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the theme as rejected and remove it from the current view. 
              You can still find it in your theme gallery if you want to use it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectTheme}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Theme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ThemeForgeApp;