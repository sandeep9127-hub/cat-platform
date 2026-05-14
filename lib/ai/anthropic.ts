import Anthropic from "@anthropic-ai/sdk";

export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const AGENT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Estimated cost in USD given input/output tokens for Haiku 4.5.
 * Used for cost capture and per-day ceiling enforcement.
 */
export function estimateCostUsd(input: number, output: number): number {
  return (input * 1.0) / 1_000_000 + (output * 5.0) / 1_000_000;
}
