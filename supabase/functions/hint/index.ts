// F6.2 — Grounded hint edge function (Deno).
//
// Receives client-built chat messages and proxies them to the LLM provider with
// the server-held API key. Security/safety posture:
//   - verify_jwt is enabled at deploy time, so only authenticated users can call.
//   - A server-authoritative system guard is ALWAYS prepended, so even a tampered
//     client payload cannot make the model reveal answers or assert correctness.
//   - Payload size is capped to prevent abuse as a free LLM proxy.
//   - Returns hint text only; never returns or computes correctness.
//
// The correct answers live in the client bundle already (validators are
// client-side), so building the prompt client-side leaks no secret; this
// function exists to keep the provider key server-side and to re-assert policy.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type ChatMessage = { role: "system" | "user"; content: string };

const MAX_TOTAL_CHARS = 8000;
const MODEL = Deno.env.get("AI_HINT_MODEL") ?? "gpt-4o-mini";

// Server-authoritative guard. Mirrors HINT_SYSTEM_PROMPT in
// src/lib/ai/prompt-builder.ts; this copy is the one that is trusted.
const SERVER_GUARD = [
  "You are a real-analysis tutor. You give small, progressive hints to a learner who answered incorrectly.",
  "NEVER reveal the final answer or anything equivalent to it. NEVER give a full solution.",
  "You do NOT decide correctness. Do not tell the learner whether an answer is right.",
  "Stay grounded in the provided problem context; do not invent mathematics. Be concise (1-3 sentences).",
].join("\n");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    (m.role === "system" || m.role === "user") && typeof m.content === "string"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "AI not configured" }, 503);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const incoming = (body as { messages?: unknown }).messages;
  if (!Array.isArray(incoming) || !incoming.every(isChatMessage)) {
    return json({ error: "messages must be an array of chat messages" }, 400);
  }

  const totalChars = incoming.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return json({ error: "payload too large" }, 413);
  }

  // Always prepend the trusted guard, then the (client) grounded messages.
  const messages: ChatMessage[] = [
    { role: "system", content: SERVER_GUARD },
    ...incoming,
  ];

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 220,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("provider error", resp.status, detail);
      return json({ error: "provider error" }, 502);
    }

    const data = await resp.json();
    const hint: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!hint) return json({ error: "empty hint" }, 502);

    return json({ hint });
  } catch (error) {
    console.error("hint function threw", error);
    return json({ error: "internal error" }, 500);
  }
});
