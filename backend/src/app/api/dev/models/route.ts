// Development models endpoint - bypasses authentication
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // Mock response for development - no authentication required
  const mockResponse = {
    success: true,
    providers: [
      {
        id: "openai",
        name: "OpenAI",
        available: true
      },
      {
        id: "gemini", 
        name: "Google Gemini",
        available: true
      },
      {
        id: "anthropic",
        name: "Anthropic Claude", 
        available: true
      }
    ],
    models: [
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        available: true
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        provider: "gemini",
        available: true
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        provider: "anthropic", 
        available: true
      }
    ]
  };

  return Response.json(mockResponse);
}
