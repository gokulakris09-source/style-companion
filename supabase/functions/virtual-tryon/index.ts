import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items, style, background, userPhotoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outfitDescription = items
      .map((item: any) => `${item.color} ${item.fabric} ${item.name} (${item.category})`)
      .join(", ");

    const styleHint = style || "modern editorial";
    const bgHint = background || "clean studio with soft lighting";

    // Build a simple text-only prompt for fastest generation
    const outfitDescription = items
      .map((item: any) => `${item.color} ${item.fabric} ${item.name} (${item.category})`)
      .join(", ");

    const styleHint = style || "modern editorial";
    const bgHint = background || "clean studio with soft lighting";

    const messages = [
      {
        role: "user",
        content: `Create a photorealistic full-body fashion photograph of a model wearing: ${outfitDescription}. Style: ${styleHint}. Background: ${bgHint}. Show complete outfit head to toe, natural pose, professional lighting. No text or watermarks.`,
      },
    ];

    // Retry logic: up to 2 attempts, fallback to text-only on second attempt
    const MAX_ATTEMPTS = 2;
    let imageUrl: string | null = null;
    let description = "";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const currentMessages = attempt === 0 ? messages : [
        // Fallback: text-only prompt without images (more reliable)
        {
          role: "user",
          content: `Create a highly realistic, full-body fashion photograph of a stylish model wearing the following outfit: ${outfitDescription}.

Style direction: ${styleHint}
Background: ${bgHint}

Important requirements:
- Photorealistic quality, like a professional lookbook or fashion magazine editorial
- Show the complete outfit from head to toe on a single model in a natural, confident pose
- Accurate fabric textures: show how the materials drape, fold, and reflect light realistically
- Correct color representation for each garment
- Professional studio lighting with soft shadows
- The outfit should look cohesive and styled together as one complete look
- No text, watermarks, or logos in the image`,
        },
      ];

      console.log(`Attempt ${attempt + 1}/${MAX_ATTEMPTS}${attempt > 0 ? " (text-only fallback)" : ""}`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: currentMessages,
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const text = await response.text();
        console.error(`AI gateway error (attempt ${attempt + 1}):`, response.status, text);
        if (attempt < MAX_ATTEMPTS - 1) continue;
        throw new Error("AI image generation failed");
      }

      const data = await response.json();
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
      description = data.choices?.[0]?.message?.content || "";

      if (imageUrl) break;
      console.warn(`No image returned on attempt ${attempt + 1}`);
    }

    if (!imageUrl) {
      throw new Error("Image generation failed after retries. Please try again.");
    }

    return new Response(JSON.stringify({ imageUrl, description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("virtual-tryon error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
