// Development threads endpoint - bypasses authentication
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // Mock response for development - no authentication required
  const mockThreads = {
    threads: [
      {
        id: "dev-thread-1",
        title: "Development Test Thread",
        created_at: new Date().toISOString()
      }
    ]
  };

  return Response.json(mockThreads);
}

export async function POST(req: NextRequest) {
  // Mock thread creation for development
  const body = await req.json();
  const mockThread = {
    thread: {
      id: "dev-thread-" + Date.now(),
      title: body.title || "New Development Thread",
      created_at: new Date().toISOString()
    }
  };

  return Response.json(mockThread);
}
