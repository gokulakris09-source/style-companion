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

    // Build multimodal content array
    const content: any[] = [];

    // Add user photo if provided
    if (userPhotoUrl) {
      content.push({
        type: "text",
        text: "Here is the person's photo. Generate an image of THIS EXACT person wearing the outfit described below. Preserve their face, body type, skin tone, and hair exactly.",
      });
      content.push({
        type: "image_url",
        image_url: { url: userPhotoUrl },
      });
    }

    // Add each clothing item image
    const itemsWithImages = items.filter((item: any) => item.image_url);
    for (const item of itemsWithImages) {
      content.push({
        type: "text",
        text: `This is the ${item.category} item "${item.name}" (${item.color} ${item.fabric}). Use this EXACT clothing piece in the output:`,
      });
      content.push({
        type: "image_url",
        image_url: { url: item.image_url },
      });
    }

    // Add the main prompt
    const mainPrompt = userPhotoUrl
      ? `Now generate a photorealistic full-body image of the person from the photo above wearing EXACTLY these clothing items: ${outfitDescription}. The clothes must match the provided images exactly — same color, pattern, fabric texture, and design details. Style: ${styleHint}. Background: ${bgHint}. Natural pose, professional lighting. Preserve the person's appearance faithfully. No text or watermarks.`
      : `Generate a photorealistic full-body fashion photograph of a model wearing EXACTLY these clothing items: ${outfitDescription}. ${itemsWithImages.length > 0 ? "The clothes must match the provided images exactly — same color, pattern, fabric texture, and design details." : "Accurately represent the described colors and fabric textures."} Style: ${styleHint}. Background: ${bgHint}. Show complete outfit head to toe, natural pose, professional lighting. No text or watermarks.`;

    content.push({ type: "text", text: mainPrompt });

    console.log("Generating try-on image with", itemsWithImages.length, "clothing images and", userPhotoUrl ? "user photo" : "no user photo");

    const makeRequest = async () => {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
        }),
      });
    };

    let response = await makeRequest();
    for (let attempt = 1; attempt <= 2 && response.status === 429; attempt++) {
      console.log(`Rate limited, retrying in ${attempt * 5}s (attempt ${attempt}/2)...`);
      await new Promise(r => setTimeout(r, attempt * 5000));
      response = await makeRequest();
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      throw new Error("No image was generated. Please try again.");
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
