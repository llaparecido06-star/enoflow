import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dish_name, dish_description, wines } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build wine list for context
    const wineList = wines.map((w: any) =>
      `- ${w.name} (${w.type}): Acidez ${w.sensory_acidity}/5, Corpo ${w.sensory_body}/5, Doçura ${w.sensory_sweetness}/5. R$ ${w.price_bottle} garrafa${w.price_glass ? `, R$ ${w.price_glass} taça` : ''}`
    ).join("\n");

    const systemPrompt = `Você é um sommelier digital premium de uma vinícola brasileira. Responda SEMPRE em português brasileiro.
Dado um prato do cardápio e a lista de vinhos disponíveis, recomende os 1-3 melhores vinhos para harmonizar.
Para cada recomendação, explique brevemente por que o vinho combina com o prato (2-3 frases elegantes).
Responda em JSON válido com esta estrutura:
{
  "recommendations": [
    {
      "wine_id": "uuid do vinho",
      "wine_name": "nome do vinho",
      "reason": "explicação da harmonização"
    }
  ]
}
Não inclua nada além do JSON.`;

    const userPrompt = `Prato: ${dish_name}
${dish_description ? `Descrição: ${dish_description}` : ''}

Vinhos disponíveis no estoque:
${wineList}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];

    const parsed = JSON.parse(jsonStr.trim());

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sommelier error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
