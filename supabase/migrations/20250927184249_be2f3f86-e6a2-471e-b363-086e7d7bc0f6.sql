-- Create theme images table
CREATE TABLE public.theme_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_data TEXT, -- base64 image data
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'applied', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.theme_images ENABLE ROW LEVEL SECURITY;

-- Create policies for theme images
CREATE POLICY "Users can view their own theme images" 
ON public.theme_images 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own theme images" 
ON public.theme_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme images" 
ON public.theme_images 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own theme images" 
ON public.theme_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_theme_images_updated_at
BEFORE UPDATE ON public.theme_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();