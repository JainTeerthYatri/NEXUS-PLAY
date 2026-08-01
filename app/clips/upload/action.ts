"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadClipAction(formData: FormData) {
  const file = formData.get("clipFile") as File;
  const title = formData.get("title") as string;
  const gameTitle = formData.get("gameTitle") as string;

  if (!file) {
    return { error: "No video file provided." };
  }

  // 1. Strict 2MB Size Restriction to preserve storage
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > MAX_SIZE) {
    return { error: "Storage Limit Exceeded: Clip file must be under 2MB." };
  }

  // 2. Validate file type (Shorts format preference)
  if (!file.type.startsWith("video/")) {
    return { error: "Invalid format. Only vertical video shorts are allowed." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized access." };
  }

  // Upload to Supabase Storage Bucket
  const fileName = `${user.id}-${Date.now()}-${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("clips")
    .upload(fileName, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from("clips")
    .getPublicUrl(fileName);

  // Insert into clips table
  const { error: dbError } = await supabase.from("clips").insert({
    user_id: user.id,
    title,
    game_title: gameTitle,
    embed_url: publicUrl,
    upvotes_count: 0,
  });

  if (dbError) {
    return { error: dbError.message };
  }

  return { success: true };
}