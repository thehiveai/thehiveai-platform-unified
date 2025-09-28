// src/app/api/health/models/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-1.5-pro";
const DEFAULT_CLAUDE_MODEL = "claude-3-haiku-20240307"; // changed here

// Env toggles for UI
const ENABLE_GEMINI =
  (process.env.NEXT_PUBLIC_ENABLE_GEMINI ?? "false").toLowerCase() === "true";
const ENABLE_CLAUDE =
  (process.env.NEXT_PUBLIC_ENABLE_CLAUDE ?? "false").toLowerCase() === "true";

export async function GET() {
  const result: {
    openai: { enabled: boolean; available: boolean; model: string; note?: string };
    gemini: { enabled: boolean; available: boolean; model: string; note?: string };
    claude: { enabled: boolean; available: boolean; model: string; note?: string };
  } = {
    openai: { enabled: !!OPENAI_API_KEY, available: false, model: DEFAULT_OPENAI_MODEL },
    gemini: { enabled: ENABLE_GEMINI && !!GEMINI_API_KEY, available: false, model: DEFAULT_GEMINI_MODEL },
    claude: { enabled: ENABLE_CLAUDE && !!ANTHROPIC_API_KEY, available: false, model: DEFAULT_CLAUDE_MODEL },
  };

  // OpenAI health
  if (result.openai.enabled) {
    try {
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      await openai.chat.completions.create({
        model: DEFAULT_OPENAI_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      result.openai.available = true;
    } catch (e: any) {
      result.openai.available = false;
      result.openai.note = String(e?.message ?? e);
    }
  }

  // Gemini health
  if (result.gemini.enabled) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: DEFAULT_GEMINI_MODEL });
      await model.generateContent({ contents: [{ role: "user", parts: [{ text: "ping" }] }] });
      result.gemini.available = true;
    } catch (e: any) {
      result.gemini.available = false;
      result.gemini.note = String(e?.message ?? e);
    }
  }

  // Claude health
  if (result.claude.enabled) {
    try {
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      await anthropic.messages.create({
        model: DEFAULT_CLAUDE_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      result.claude.available = true;
    } catch (e: any) {
      result.claude.available = false;
      result.claude.note = String(e?.message ?? e);
    }
  }

  return NextResponse.json(result);
}
