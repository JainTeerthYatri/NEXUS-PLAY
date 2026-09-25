"use server";

import { createClient } from "@/lib/supabase/server";

export async function uploadClipAction(formData: FormData) {
  const file = formData.get("clipFile") as File;
  const rawTitle = formData.get("title") as string;
  const rawGameTitle = formData.get("gameTitle") as string;

  if (!file) {
    return { error: "No video file provided." };
  }

  // 1. Validate text metadata
  const title = rawTitle?.trim();
  const gameTitle = rawGameTitle?.trim();

  if (!title || title.length > 100) {
    return { error: "Clip title must be between 1 and 100 characters." };
  }

  if (!gameTitle || gameTitle.length > 50) {
    return { error: "Game title must be between 1 and 50 characters." };
  }

  // 2. Strict 2MB size restriction
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > MAX_SIZE) {
    return { error: "Storage Limit Exceeded: Clip file must be under 2MB." };
  }

  // 3. Strict video MIME-type validation
  const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime"];
  if (!allowedMimeTypes.includes(file.type)) {
    return { error: "Invalid format. Only vertical video shorts (MP4, WebM, MOV) are allowed." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized access: Session expired or invalid." };
  }

  // 4. Upload to Supabase Storage bucket
  const fileExt = file.name.split(".").pop() || "mp4";
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `videos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("clips")
    .upload(filePath, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  // 5. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from("clips")
    .getPublicUrl(filePath);

  // 6. Insert metadata into clips table
  const { data: insertedClip, error: dbError } = await supabase
    .from("clips")
    .insert({
      user_id: user.id,
      title,
      game_title: gameTitle,
      video_url: publicUrl,
      embed_url: publicUrl,
      upvotes_count: 0,
    })
    .select("id")
    .single();

  // 7. Cleanup orphan storage file if database insert fails
  if (dbError) {
    await supabase.storage.from("clips").remove([filePath]);
    return { error: "Database registration failed. Uploaded telemetry purged." };
  }

  // 8. Register operational audit trail
  try {
    await supabase.from("audit_logs").insert({
      moderator_id: user.id,
      action_type: "UPLOAD_CLIP",
      target_id: insertedClip.id,
      details: `Operator uploaded reel: "${title}" for ${gameTitle}.`
    });
  } catch (logErr) {
    console.error("Failed to insert clip upload audit log:", logErr);
  }

  return { success: true };
}