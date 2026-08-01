// utils/leveling.ts
import { createClient } from "@/lib/supabase/client";

export function calculateOperatorTier(xp: number = 0) {
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXp = xp % 500;
  const nextLevelXp = 500;
  const progressPercent = (currentLevelXp / nextLevelXp) * 100;

  let tierName = "Bronze Operator";
  if (level >= 50) tierName = "Immortal Operator";
  else if (level >= 40) tierName = "Master Operator";
  else if (level >= 30) tierName = "Diamond Operator";
  else if (level >= 20) tierName = "Platinum Operator";
  else if (level >= 10) tierName = "Gold Operator";
  else if (level >= 5) tierName = "Silver Operator";

  return {
    level,
    tierName,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
  };
}

// XP Increment Helper Function
export async function addOperatorXp(userId: string, xpAmount: number) {
  const supabase = createClient();

  // 1. Current XP fetch karo
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("xp")
    .eq("id", userId)
    .single();

  if (fetchError) {
    console.error("Error fetching XP:", fetchError.message);
    return;
  }

  const currentXp = profile?.xp || 0;
  const newXp = currentXp + xpAmount;

  // 2. Updated XP database mein save karo
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: newXp })
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating XP:", updateError.message);
  }
}