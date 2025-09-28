// src/app/api/health/azure-openai/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

export async function GET(req: NextRequest) {
  try {
    // Check if Azure OpenAI is configured
    const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "";
    const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
    const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) {
      return Response.json({
        status: "not_configured",
        message: "Azure OpenAI not configured. Using regular OpenAI instead.",
        configured: false,
        endpoint: null,
        version: null
      });
    }

    // Test connection with a simple completion
    const testStart = Date.now();
    
    try {
      // Try to list deployments to test connection
      const response = await fetch(`${AZURE_OPENAI_ENDPOINT}/openai/deployments?api-version=${AZURE_OPENAI_API_VERSION}`, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_OPENAI_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      const latency = Date.now() - testStart;

      if (!response.ok) {
        const errorText = await response.text();
        return Response.json({
          status: "error",
          message: `Azure OpenAI API error: ${response.status} ${response.statusText}`,
          configured: true,
          endpoint: AZURE_OPENAI_ENDPOINT,
          version: AZURE_OPENAI_API_VERSION,
          error: errorText,
          latency_ms: latency
        }, { status: 500 });
      }

      const deployments = await response.json();

      return Response.json({
        status: "healthy",
        message: "Azure OpenAI is connected and working",
        configured: true,
        endpoint: AZURE_OPENAI_ENDPOINT,
        version: AZURE_OPENAI_API_VERSION,
        deployments: deployments.data || [],
        latency_ms: latency,
        timestamp: new Date().toISOString()
      });

    } catch (apiError: any) {
      const latency = Date.now() - testStart;
      
      return Response.json({
        status: "error",
        message: `Azure OpenAI connection failed: ${apiError.message}`,
        configured: true,
        endpoint: AZURE_OPENAI_ENDPOINT,
        version: AZURE_OPENAI_API_VERSION,
        error: apiError.message,
        latency_ms: latency
      }, { status: 500 });
    }

  } catch (error: any) {
    return Response.json({
      status: "error",
      message: `Health check failed: ${error.message}`,
      configured: false,
      error: error.message
    }, { status: 500 });
  }
}
