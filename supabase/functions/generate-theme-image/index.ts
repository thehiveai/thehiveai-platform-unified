import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content filter keywords for moderation
const INAPPROPRIATE_CONTENT = [
  'nude', 'naked', 'sex', 'porn', 'explicit', 'adult', 'nsfw',
  'violence', 'gore', 'blood', 'murder', 'kill', 'death',
  'hate', 'racist', 'discrimination', 'terrorist', 'drug',
  'weapon', 'gun', 'bomb', 'suicide'
];

function containsInappropriateContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return INAPPROPRIATE_CONTENT.some(keyword => lowerText.includes(keyword));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Theme image generation function called');
    
    const { prompt, title } = await req.json();
    
    if (!prompt || !title) {
      throw new Error('Prompt and title are required');
    }

    console.log('Generating theme image with prompt:', prompt);

    // Content filtering check
    if (containsInappropriateContent(prompt)) {
      console.log('Content filter triggered for prompt:', prompt);
      return new Response(JSON.stringify({ 
        error: 'Content policy violation: Your prompt contains inappropriate content. Please use family-friendly descriptions only.',
        filtered: true
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced prompt for better desktop wallpaper generation
    const enhancedPrompt = `Create a stunning desktop wallpaper background image: ${prompt}. 
    High resolution, professional quality, suitable for desktop background, 
    clean composition, vibrant colors, no text or watermarks, 16:9 aspect ratio optimized.`;

    console.log('Calling OpenAI image generation API');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: enhancedPrompt,
        size: '1792x1024', // Good for desktop wallpapers
        quality: 'high',
        n: 1,
        output_format: 'png'
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 400 && errorData.includes('content_policy_violation')) {
        return new Response(JSON.stringify({ 
          error: 'Content policy violation: Your image request was rejected for safety reasons. Please try a different description.',
          filtered: true
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI image generation successful');

    if (!data.data || !data.data[0]) {
      throw new Error('No image data received from OpenAI');
    }

    const imageData = data.data[0];
    
    // For gpt-image-1, the response is always base64 encoded
    const base64Image = imageData.b64_json;
    
    if (!base64Image) {
      throw new Error('No base64 image data received');
    }

    console.log('Theme image generated successfully');

    return new Response(JSON.stringify({
      success: true,
      image_data: base64Image,
      image_url: `data:image/png;base64,${base64Image}`,
      title,
      prompt,
      model: 'gpt-image-1'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-theme-image function:', error);
    
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});