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

    // Collect clothing image URLs for visual reference
    const clothingImageParts: any[] = [];
    for (const item of items) {
      if (item.image_url) {
        clothingImageParts.push({
          type: "image_url",
          image_url: { url: item.image_url },
        });
      }
    }

    const hasClothingImages = clothingImageParts.length > 0;

    // Build messages based on whether user photo and clothing images are provided
    let messages: any[];

    if (userPhotoUrl) {
      // Photo-based try-on with actual clothing images
      const contentParts: any[] = [
        {
          type: "text",
          text: `You are a professional virtual try-on AI specializing in realistic clothing visualization.

TASK: Dress the person in the provided photo wearing EXACTLY the clothing items shown in the reference images below.

Person's photo is the FIRST image. The subsequent images are the EXACT clothing items to apply:
${items.map((item: any, idx: number) => `- Clothing ${idx + 1}: ${item.color} ${item.fabric} ${item.name} (${item.category})`).join("\n")}

Style direction: ${styleHint}
Background: ${bgHint}

CRITICAL REQUIREMENTS:
1. PRESERVE THE PERSON EXACTLY: Keep their face, body shape, skin tone, hair, and pose identical to the input photo
2. USE THE EXACT CLOTHING from the reference images — match the precise color, pattern, texture, fabric weave, and design details of each garment
3. FIT NATURALLY: The clothing must conform to the person's body proportions with realistic draping, wrinkles, folds, and shadows where fabric meets the body
4. CORRECT LAYERING: Place items in proper order (e.g., shirt under jacket, pants at waist level, accessories on top)
5. LIGHTING CONSISTENCY: Match the lighting on the clothing to the original photo's lighting direction and intensity
6. PHOTOREALISTIC OUTPUT: The final image must look like a real high-resolution photograph — no artificial look, no cartoon style, no distortions
7. COLOR ACCURACY: The colors of each garment must exactly match the reference clothing images
8. No text, watermarks, logos, or artifacts`,
        },
        { type: "image_url", image_url: { url: userPhotoUrl } },
        ...clothingImageParts,
      ];

      messages = [{ role: "user", content: contentParts }];
    } else if (hasClothingImages) {
      // No user photo but has clothing images — use a model wearing the exact clothes
      const contentParts: any[] = [
        {
          type: "text",
          text: `You are a professional virtual try-on AI. Generate a photorealistic full-body fashion photograph of a model wearing EXACTLY the clothing items shown in the reference images below.

The images provided are the EXACT clothing items to use:
${items.map((item: any, idx: number) => `- Clothing ${idx + 1}: ${item.color} ${item.fabric} ${item.name} (${item.category})`).join("\n")}

Style direction: ${styleHint}
Background: ${bgHint}

CRITICAL REQUIREMENTS:
1. USE THE EXACT CLOTHING from each reference image — replicate the precise color, pattern, texture, fabric weave, and all design details
2. Show the complete outfit on a single model in a natural, confident pose from head to toe
3. The clothing must fit the model naturally with realistic draping, wrinkles, and shadows
4. Correct layering order (undergarments covered by outer layers, accessories visible)
5. Professional studio-quality lighting with soft shadows
6. Photorealistic quality — like a professional lookbook or fashion editorial photograph
7. COLOR ACCURACY: Each garment's colors must exactly match the reference images
8. No text, watermarks, logos, or artifacts`,
        },
        ...clothingImageParts,
      ];

      messages = [{ role: "user", content: contentParts }];
    } else {
      // Fallback: no images at all, use text description only
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
