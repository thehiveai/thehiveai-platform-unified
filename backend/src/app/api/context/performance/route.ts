import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUser, resolveOrgId, assertMembership } from "@/lib/membership";
import { ContextPerformanceMonitor } from "@/lib/hotContext";

// GET /api/context/performance - Get context performance metrics
export async function GET(req: Request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    await assertMembership(orgId, userId);

    // Get URL parameters
    const url = new URL(req.url);
    const threadId = url.searchParams.get("threadId");

    // Get performance stats
    const performanceStats = ContextPerformanceMonitor.getStats();

    // Get thread-specific stats if threadId provided
    let threadStats = null;
    if (threadId) {
      // TODO: Implement getContextStats function in hotContext.ts
      threadStats = { threadId, note: "getContextStats not implemented yet" };
    }

    return NextResponse.json({
      success: true,
      performance: performanceStats,
      thread: threadStats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Context performance API error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/context/performance/test - Test context performance with sample data
export async function POST(req: Request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await ensureUser(session);
    const orgId = await resolveOrgId(userId);
    await assertMembership(orgId, userId);

    const body = await req.json();
    const { threadId, testMessage = "Test context performance" } = body;

    if (!threadId) {
      return NextResponse.json({ 
        error: "threadId is required" 
      }, { status: 400 });
    }

    // Import the context function dynamically to avoid circular imports
    const { getContextEnhancedPrompt } = await import("@/lib/hotContext");

    // Test context retrieval performance
    const startTime = Date.now();
    
    const contextResult = await getContextEnhancedPrompt(threadId, testMessage, {
      maxContextMessages: 10,
      minContextLength: 1, // Force context for testing
      forceContext: true
    });

    const totalTime = Date.now() - startTime;

    // Performance analysis
    const analysis = {
      performance: {
        totalTimeMs: totalTime,
        contextRetrievalMs: contextResult.processingTimeMs,
        contextInjectionMs: totalTime - contextResult.processingTimeMs,
        isOptimal: totalTime < 100, // Target: sub-100ms
        rating: totalTime < 50 ? "Excellent" : 
                totalTime < 100 ? "Good" : 
                totalTime < 200 ? "Acceptable" : "Needs Optimization"
      },
      context: {
        messagesUsed: contextResult.contextUsed.length,
        originalPromptLength: contextResult.originalPrompt.length,
        enhancedPromptLength: contextResult.enhancedPrompt.length,
        contextAdded: contextResult.enhancedPrompt.length - contextResult.originalPrompt.length,
        hasContext: contextResult.contextUsed.length > 0
      },
      recommendations: [] as string[]
    };

    // Add performance recommendations
    if (totalTime > 200) {
      analysis.recommendations.push("Consider reducing maxContextMessages or adding database indexes");
    }
    if (contextResult.contextUsed.length === 0) {
      analysis.recommendations.push("No context found - check if thread has messages");
    }
    if (contextResult.enhancedPrompt.length > 4000) {
      analysis.recommendations.push("Context prompt is very long - consider reducing context window");
    }
    if (totalTime < 50) {
      analysis.recommendations.push("Excellent performance! Context system is optimized.");
    }

    return NextResponse.json({
      success: true,
      test: analysis,
      contextResult: {
        originalPrompt: contextResult.originalPrompt,
        enhancedPrompt: contextResult.enhancedPrompt.substring(0, 500) + "...", // Truncate for response
        contextUsed: contextResult.contextUsed.map(msg => ({
          role: msg.role,
          contentLength: msg.content.length,
          created_at: msg.created_at
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Context performance test error:", error);
    return NextResponse.json({
      error: "Performance test failed",
      details: error.message
    }, { status: 500 });
  }
}
