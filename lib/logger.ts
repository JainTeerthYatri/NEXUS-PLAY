// lib/logger.ts
export async function logUserAction(
  supabase: any,
  userId: string,       // Chahe member ho ya mod, user ki ID yahan aayegi
  actionType: string,   // Jaise: 'USER_LOGIN', 'CREATE_SQUAD', 'DELETE_CLIP', etc.
  targetId: string,     // Jis item par action hua uska ID (ya 'N/A')
  details: string       // Full description
) {
  try {
    await supabase.from('audit_logs').insert({
      moderator_id: userId, // Aapke table column ka naam moderator_id hai, isliye yahan user ki id jayegi
      action_type: actionType,
      target_id: targetId,
      details: details
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
