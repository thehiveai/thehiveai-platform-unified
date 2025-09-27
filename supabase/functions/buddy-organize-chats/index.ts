import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Buddy organize chats function called');
    
    const { chats } = await req.json();
    console.log(`Analyzing ${chats.length} chats for organization`);

    if (!chats || chats.length === 0) {
      return new Response(JSON.stringify({ 
        recommendations: [],
        message: 'No chats to organize' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a prompt for the AI to analyze chat content and suggest organization
    const chatSummaries = chats.map((chat: any) => ({
      id: chat.id,
      title: chat.title,
      messageCount: chat.messages.length,
      // Get a brief sample of the conversation
      sample: chat.messages.slice(0, 3).map((msg: any) => 
        `${msg.role}: ${msg.content_text?.substring(0, 100) || 'No content'}...`
      ).join('\n')
    }));

    const prompt = `You are Buddy, an AI assistant helping to organize chat conversations. 
    
Analyze the following chat conversations and provide recommendations for organizing them into folders.

Chat data:
${JSON.stringify(chatSummaries, null, 2)}

Please provide:
1. Suggested folder names based on chat topics/themes
2. Which chats should go into each folder
3. Brief explanation of why these groupings make sense

Respond in JSON format:
{
  "folders": [
    {
      "name": "Folder Name",
      "description": "Why this folder is useful",
      "chatIds": ["chat-id-1", "chat-id-2"]
    }
  ],
  "summary": "Brief summary of organization strategy"
}

Focus on practical, useful groupings that will help the user find their conversations easily.`;

    console.log('Calling OpenAI for chat organization recommendations');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Buddy, a helpful AI assistant that helps organize chat conversations into logical folders. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI');
    }

    let recommendations;
    try {
      recommendations = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback response
      recommendations = {
        folders: [],
        summary: "I had trouble analyzing your chats. Please try again or organize them manually."
      };
    }

    console.log('Buddy recommendations generated:', recommendations);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in buddy-organize-chats function:', error);
    
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Internal server error',
      folders: [],
      summary: "I'm having trouble right now. Please try again later or organize your chats manually."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});