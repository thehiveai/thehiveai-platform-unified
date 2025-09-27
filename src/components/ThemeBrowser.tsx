import { useState, useEffect } from 'react';
import { X, Download, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ThemeImage {
  id: string;
  title: string;
  prompt: string;
  image_url: string;
  image_data?: string;
  status: 'generated' | 'applied' | 'rejected';
  created_at: string;
}

interface ThemeBrowserProps {
  onClose: () => void;
  onSelectTheme: (theme: ThemeImage) => void;
}

const ThemeBrowser = ({ onClose, onSelectTheme }: ThemeBrowserProps) => {
  const [themes, setThemes] = useState<ThemeImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes();
  }, []);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('theme_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setThemes((data || []).map(theme => ({
        ...theme,
        status: theme.status as 'generated' | 'applied' | 'rejected'
      })));
    } catch (error) {
      console.error('Error fetching themes:', error);
      toast.error('Failed to load your themes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      const { error } = await supabase
        .from('theme_images')
        .delete()
        .eq('id', themeId);

      if (error) throw error;
      
      setThemes(themes.filter(t => t.id !== themeId));
      toast.success('Theme deleted');
    } catch (error) {
      console.error('Error deleting theme:', error);
      toast.error('Failed to delete theme');
    }
  };

  const handleDownload = (theme: ThemeImage) => {
    const link = document.createElement('a');
    link.href = theme.image_url;
    link.download = `${theme.title.replace(/\s+/g, '_')}_${theme.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Theme downloaded');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { 
             hour: '2-digit', 
             minute: '2-digit' 
           });
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="text-muted-foreground">Loading your themes...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-md border-b border-border/50 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Theme Gallery</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {themes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No themes yet</p>
              <p>Generate some beautiful backgrounds to see them here</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {themes.map((theme) => (
                <Card 
                  key={theme.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTheme(
                    selectedTheme === theme.id ? null : theme.id
                  )}
                >
                  <div className="aspect-video relative overflow-hidden rounded-t-lg">
                    <img 
                      src={theme.image_url} 
                      alt={theme.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                      <Button
                        size="sm"
                        className="mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTheme(theme);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Select
                      </Button>
                    </div>
                  </div>
                  
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate mb-1">
                      {theme.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {theme.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className={`px-2 py-1 rounded text-xs ${
                        theme.status === 'applied' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : theme.status === 'rejected'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {theme.status}
                      </span>
                      <span>{formatDate(theme.created_at)}</span>
                    </div>
                    
                    {selectedTheme === theme.id && (
                      <div className="flex gap-1 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(theme);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTheme(theme.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default ThemeBrowser;