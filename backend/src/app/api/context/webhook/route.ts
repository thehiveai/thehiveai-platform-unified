import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { timingSafeEqual } from "crypto";

// Webhook endpoint for N8N to send chat data for context processing
export async function POST(req: Request) {
  try {
    // Verify webhook authentication
    const webhookToken = req.headers.get("x-webhook-token") ?? "";
    const expectedToken = process.env.N8N_WEBHOOK_TOKEN ?? "";
    
    if (!expectedToken || !safeEqual(webhookToken, expectedToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      event_type, 
      org_id, 
      thread_id, 
      message_id, 
      content, 
      metadata = {} 
    } = body;

    // Validate required fields
    if (!event_type || !org_id) {
      return NextResponse.json({ 
        error: "Missing required fields: event_type, org_id" 
      }, { status: 400 });
    }

    // Process different event types
    switch (event_type) {
      case "message_created":
        return await handleMessageCreated({
          org_id,
          thread_id,
          message_id,
          content,
          metadata
        });

      case "thread_updated":
        return await handleThreadUpdated({
          org_id,
          thread_id,
          metadata
        });

      case "context_request":
        return await handleContextRequest({
          org_id,
          thread_id,
          query: content,
          metadata
        });

      default:
        return NextResponse.json({ 
          error: `Unknown event type: ${event_type}` 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Context webhook error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}

// Handle new message creation - trigger context indexing
async function handleMessageCreated({
  org_id,
  thread_id,
  message_id,
  content,
  metadata
}: {
  org_id: string;
  thread_id?: string;
  message_id?: string;
  content: string;
  metadata: any;
}) {
  // Store the message content for processing
  const { data: contextData, error } = await supabaseAdmin
    .from("context_embeddings")
    .insert({
      org_id,
      thread_id,
      message_id,
      content_type: "message",
      content_text: content,
      metadata: {
        ...metadata,
        processing_status: "pending",
        created_via: "webhook"
      }
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to store context data: ${error.message}`);
  }

  return NextResponse.json({
    success: true,
    context_id: contextData.id,
    message: "Message queued for context processing"
  });
}

// Handle thread updates - trigger summary generation
async function handleThreadUpdated({
  org_id,
  thread_id,
  metadata
}: {
  org_id: string;
  thread_id: string;
  metadata: any;
}) {
  // Check if thread needs summary update
  const { data: existingSummary } = await supabaseAdmin
    .from("context_summaries")
    .select("id, updated_at")
    .eq("org_id", org_id)
    .eq("thread_id", thread_id)
    .eq("summary_type", "thread")
    .single();

  // Create or update thread summary
  const summaryData = {
    org_id,
    thread_id,
    summary_type: "thread" as const,
    summary_text: metadata.summary || "Thread summary pending",
    key_points: metadata.key_points || [],
    entities_mentioned: metadata.entities || [],
    confidence_score: metadata.confidence || 0.0
  };

  let result;
  if (existingSummary) {
    const { data, error } = await supabaseAdmin
      .from("context_summaries")
      .update({ ...summaryData, updated_at: new Date().toISOString() })
      .eq("id", existingSummary.id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update summary: ${error.message}`);
    result = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from("context_summaries")
      .insert(summaryData)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create summary: ${error.message}`);
    result = data;
  }

  return NextResponse.json({
    success: true,
    summary_id: result.id,
    message: "Thread summary updated"
  });
}

// Handle context retrieval requests
async function handleContextRequest({
  org_id,
  thread_id,
  query,
  metadata
}: {
  org_id: string;
  thread_id?: string;
  query: string;
  metadata: any;
}) {
  const limit = metadata.limit || 10;
  const similarity_threshold = metadata.similarity_threshold || 0.7;

  // If we have a query embedding, use semantic search
  if (metadata.query_embedding) {
    const { data: contextResults, error } = await supabaseAdmin
      .rpc("search_context_embeddings", {
        p_org_id: org_id,
        p_query_embedding: metadata.query_embedding,
        p_limit: limit,
        p_similarity_threshold: similarity_threshold
      });

    if (error) {
      throw new Error(`Context search failed: ${error.message}`);
    }

    // Log context usage
    if (contextResults && contextResults.length > 0) {
      await logContextUsage({
        org_id,
        thread_id,
        context_type: "embedding",
        context_ids: contextResults.map((r: any) => r.id),
        usage_type: "retrieval",
        relevance_scores: contextResults.map((r: any) => r.similarity)
      });
    }

    return NextResponse.json({
      success: true,
      context_results: contextResults,
      count: contextResults?.length || 0
    });
  }

  // If we have a thread_id, get thread-specific context
  if (thread_id) {
    const { data: threadContext, error } = await supabaseAdmin
      .rpc("get_thread_context", {
        p_org_id: org_id,
        p_thread_id: thread_id,
        p_limit: limit
      });

    if (error) {
      throw new Error(`Thread context retrieval failed: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      context_results: threadContext,
      count: threadContext?.length || 0
    });
  }

  // Fallback: return recent context for the org
  const { data: recentContext, error } = await supabaseAdmin
    .from("context_embeddings")
    .select("id, content_text, metadata, thread_id, message_id, created_at")
    .eq("org_id", org_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Recent context retrieval failed: ${error.message}`);
  }

  return NextResponse.json({
    success: true,
    context_results: recentContext,
    count: recentContext?.length || 0
  });
}

// Log context usage for audit and optimization
async function logContextUsage({
  org_id,
  thread_id,
  message_id,
  context_type,
  context_ids,
  usage_type,
  relevance_scores
}: {
  org_id: string;
  thread_id?: string;
  message_id?: string;
  context_type: string;
  context_ids: string[];
  usage_type: string;
  relevance_scores?: number[];
}) {
  const { error } = await supabaseAdmin
    .from("context_usage")
    .insert({
      org_id,
      thread_id,
      message_id,
      context_type,
      context_ids,
      usage_type,
      relevance_scores: relevance_scores || []
    });

  if (error) {
    console.error("Failed to log context usage:", error);
    // Don't throw - this is non-critical
  }
}

// Safe string comparison to prevent timing attacks
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(new Uint8Array(aBuf), new Uint8Array(bBuf));
}
