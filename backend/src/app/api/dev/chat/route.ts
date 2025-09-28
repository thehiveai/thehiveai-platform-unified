// Development chat endpoint - bypasses authentication
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, provider = "openai", modelId = "gpt-4o-mini" } = body;

    // Mock streaming response for development
    const mockResponse = `Hello! This is a development mock response to your message: "${message}". 

I can see you're testing the chat functionality. The voice and conversational features should work once you're properly authenticated.

This is a simulated response from ${modelId} (${provider} provider) for development testing purposes.`;

    // Create a readable stream to simulate streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming by sending chunks with delays
        const words = mockResponse.split(' ');
        let index = 0;

        const sendNextChunk = () => {
          if (index < words.length) {
            const chunk = words[index] + ' ';
            controller.enqueue(encoder.encode(chunk));
            index++;
            setTimeout(sendNextChunk, 50); // 50ms delay between words
          } else {
            controller.close();
          }
        };

        sendNextChunk();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error('Development chat error:', error);
    return Response.json({
      error: "Development chat endpoint error"
    }, { status: 500 });
  }
}
