// F8.3 / Stage 6 — Problem generation edge function (Deno).
//
// The LLM PROPOSES candidate problems; it never decides what is served.
// Authoritative verification happens on the CLIENT: the numeric path
// (`parseLlmCandidates`) re-evaluates each math.js expression, and the
// conceptual beta path (`parseConceptCandidates`) structurally gates and
// canonically re-encodes each item; both then pass the shared `verifyCandidate`
// gate against the real validator. This function is a thin proxy that injects
// the server-held API key and returns the raw model text for the client to
// verify. The detailed item contract lives in the client-built messages, so the
// server guard here is intentionally schema-agnostic — it only enforces JSON
// output and the never-reveal-the-answer policy, and never fights the caller's
// schema (numeric OR conceptual).
//
// Safety: verify_jwt enabled at deploy (authenticated callers only); payload
// capped; a server-authoritative guard message is always prepended.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type ChatMessage = { role: "system" | "user"; content: string };

const MAX_TOTAL_CHARS = 8000;
const MODEL = Deno.env.get("AI_GENERATION_MODEL") ?? "gpt-4o-mini";

const SERVER_GUARD = [
  "You generate real-analysis practice problems on request.",
  "Return ONLY valid JSON that matches the structure the user message specifies — no prose, no markdown fences.",
  "Never reveal or restate the correct answer inside a problem's prompt text.",
  "Every problem must be mathematically correct and well-posed.",
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
  if (totalChars > MAX_TOTAL_CHARS) return json({ error: "payload too large" }, 413);

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
        temperature: 0.7,
        max_tokens: 1800,
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("provider error", resp.status, detail);
      return json({ error: "provider error" }, 502);
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    // Client (F8.2) parses + independently verifies; we forward raw text only.
    return json({ raw });
  } catch (error) {
    console.error("generate-problems threw", error);
    return json({ error: "internal error" }, 500);
  }
});
