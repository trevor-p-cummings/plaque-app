// Supabase Edge Function: generate-narrative
// Called via supabase.functions.invoke("generate-narrative", { body: { title, description, address, year_erected } })
// Returns: { narrative, quiz: { question, options, correct_index } }
// Uses server-side API key — never exposed to client.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

interface PlaqueInput {
  title: string;
  description: string;
  address?: string;
  year_erected?: number;
}

interface NarrativeResponse {
  narrative: string;
  quiz: {
    question: string;
    options: string[];
    correct_index: number;
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body: PlaqueInput = await req.json();

  if (!body.title || !body.description) {
    return new Response(
      JSON.stringify({ error: "title and description are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build a fact block from the structured plaque data
  const facts = [
    `Title: ${body.title}`,
    `Description: ${body.description}`,
    body.address ? `Address: ${body.address}` : null,
    body.year_erected ? `Year established: ${body.year_erected}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are a historical storyteller and quiz author.
You will receive structured facts about a historical plaque.

Your job:
1. Write a SHORT narrative (2-3 paragraphs, under 200 words) that is engaging and vivid. Use ONLY the facts provided. Do NOT invent names, dates, events, or details that are not in the input.
2. Write ONE quiz question whose answer can be found in the provided facts. Provide exactly THREE answer options. Exactly one must be correct.

Respond with valid JSON matching this schema exactly:
{
  "narrative": "string",
  "quiz": {
    "question": "string",
    "options": ["string", "string", "string"],
    "correct_index": 0
  }
}

Rules:
- Do NOT add historical facts beyond what is provided.
- The quiz answer MUST be directly stated in the provided facts.
- correct_index is 0-based.
- Return ONLY the JSON object, no markdown fences or extra text.`;

  const userPrompt = `Here are the facts about the plaque:\n\n${facts}`;

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
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return new Response(
      JSON.stringify({ error: "AI request failed", detail: errText }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  // Parse the JSON response from the model
  let parsed: NarrativeResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // If the model wrapped it in markdown fences, strip them
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({
          narrative: raw,
          quiz: null,
          error: "Could not parse structured response",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Validate the shape
  if (
    typeof parsed.narrative !== "string" ||
    !parsed.quiz ||
    !Array.isArray(parsed.quiz.options) ||
    parsed.quiz.options.length !== 3 ||
    typeof parsed.quiz.correct_index !== "number" ||
    parsed.quiz.correct_index < 0 ||
    parsed.quiz.correct_index > 2
  ) {
    return new Response(
      JSON.stringify({
        narrative: parsed.narrative ?? raw,
        quiz: null,
        error: "Response did not match expected schema",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify(parsed), {
    headers: { "Content-Type": "application/json" },
  });
});
