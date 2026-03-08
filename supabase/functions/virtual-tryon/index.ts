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

    // Build messages based on whether user photo is provided
    let messages: any[];

    if (userPhotoUrl) {
      // Photo-based try-on: overlay clothing onto user's photo
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a virtual try-on AI. Look at this person's photo carefully — note their body shape, pose, skin tone, and proportions.

Now dress this EXACT person in the following outfit: ${outfitDescription}

Style direction: ${styleHint}
Background: ${bgHint}

Critical requirements:
- Keep the person's face, body shape, pose, and proportions EXACTLY as in the photo
- Replace/overlay their current clothing with the specified outfit items
- Ensure the clothing fits naturally on their body — proper draping, wrinkles, and shadows
- Maintain realistic fabric textures and accurate colors for each garment
- The result must look like a real photograph of this person wearing these clothes
- Preserve natural lighting consistent with the background setting
- No text, watermarks, or logos`,
            },
            {
              type: "image_url",
              image_url: { url: userPhotoUrl },
            },
          ],
        },
      ];
    } else {
      // Generic model try-on (no user photo)
      messages = [
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
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages,
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
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI image generation failed");
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    const description = data.choices?.[0]?.message?.content || "";

    if (!imageUrl) {
      throw new Error("No image was generated");
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
