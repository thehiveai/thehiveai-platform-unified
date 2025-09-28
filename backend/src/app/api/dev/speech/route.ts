// Development speech endpoint - bypasses authentication
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Get the audio file from the request
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return Response.json({
        success: false,
        error: "No audio file provided"
      }, { status: 400 });
    }

    console.log('🎤 Development speech-to-text - simulating transcription');

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock transcription responses for development
    const mockTranscriptions = [
      "Hello, this is a test of the voice recognition system.",
      "Testing voice input functionality in development mode.",
      "Voice to text conversion is working in development.",
      "This is a simulated speech transcription for testing.",
      "Development mode voice recognition is active."
    ];

    const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];

    console.log(`🎤 Development speech transcribed: "${randomTranscription}"`);

    return Response.json({
      success: true,
      text: randomTranscription,
      service: 'Development Mock',
      note: 'This is a simulated transcription for development testing'
    });

  } catch (error: any) {
    console.error('Development speech processing error:', error);
    return Response.json({
      success: false,
      error: `Development speech processing failed: ${error.message}`
    }, { status: 500 });
  }
}
