// src/app/api/speech/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

// For speech-to-text, always use regular OpenAI since Azure OpenAI Whisper deployment is not available
const effectiveOpenAIKey = OPENAI_API_KEY;

if (!effectiveOpenAIKey) {

}

// Initialize OpenAI client for speech-to-text


export async function POST(req: NextRequest) {
  // Runtime guard & client init (avoids import-time failures in CI)
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "Server misconfigured: OPENAI_API_KEY missing" }), { status: 500 });
  }
  const openai = new OpenAI({ apiKey: key });
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get the audio file from the request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return new Response("No audio file provided", { status: 400 });
    }

    console.log('🎤 Processing speech-to-text using OpenAI');

    try {
      // Convert File to the format expected by OpenAI
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en", // Optional: specify language for better accuracy
        response_format: "json",
        temperature: 0.2, // Lower temperature for more consistent transcription
      });

      const transcribedText = response.text;

      if (!transcribedText || !transcribedText.trim()) {
        return Response.json({
          success: false,
          error: "No speech detected in the audio"
        }, { status: 400 });
      }

      console.log(`🎤 Speech transcribed successfully: "${transcribedText.substring(0, 50)}..."`);

      return Response.json({
        success: true,
        text: transcribedText,
        service: 'OpenAI'
      });

    } catch (apiError: any) {
      console.error('Speech-to-text API error:', apiError);
      
      return Response.json({
        success: false,
        error: `Speech-to-text failed: ${apiError.message || 'Unknown error'}`,
        service: 'OpenAI'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Speech processing error:', error);
    return Response.json({
      success: false,
      error: `Failed to process speech: ${error.message}`
    }, { status: 500 });
  }
}

