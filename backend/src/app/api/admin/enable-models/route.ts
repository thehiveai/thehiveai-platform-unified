export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Simple endpoint to enable all models for testing
export async function POST() {
  try {
    const orgId = "00000000-0000-0000-0000-000000000001"; // Default org ID
    
    // Enable all models
    const modelSettings = {
      openai: true,
      gemini: true,
      anthropic: true
    };

    // Upsert the tenant settings
    const { error } = await supabaseAdmin
      .from("tenant_settings")
      .upsert(
        { 
          org_id: orgId, 
          key: "modelEnabled", 
          value: modelSettings 
        },
        { onConflict: "org_id,key" }
      );

    if (error) {
      throw error;
    }

    // Verify the settings
    const { data: settings, error: fetchError } = await supabaseAdmin
      .from("tenant_settings")
      .select("*")
      .eq("org_id", orgId);

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({ 
      success: true, 
      message: "All models enabled successfully",
      settings 
    });

  } catch (error: any) {
    console.error("Error enabling models:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enable models" },
      { status: 500 }
    );
  }
}

