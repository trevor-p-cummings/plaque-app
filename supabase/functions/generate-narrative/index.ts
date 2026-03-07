// Supabase Edge Function: generate-narrative
// Called via supabase.functions.invoke("generate-narrative", { body: { title, description } })
// Uses server-side API key — never exposed to client.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { title, description } = await req.json();

  if (!title || !description) {
    return new Response(JSON.stringify({ error: "title and description required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `You are a historical storyteller. Given factual information about a historical plaque, write a short, engaging narrative (2-3 paragraphs). ONLY use the facts provided — do NOT invent additional historical details. Keep it vivid but accurate.`;

  const userPrompt = `Plaque title: ${title}\nPlaque description: ${description}\n\nWrite a short engaging narrative based ONLY on these facts.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const narrative = data.choices?.[0]?.message?.content ?? "Unable to generate narrative.";

  return new Response(JSON.stringify({ narrative }), {
    headers: { "Content-Type": "application/json" },
  });
});
