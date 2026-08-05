export async function insertAuditLog(
  supabase: any, 
  moderatorId: string, 
  actionType: string, 
  targetId: string, 
  details: string
) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        moderator_id: moderatorId,
        action_type: actionType,
        target_id: targetId,
        details: details
      });

    if (error) {
      console.error("Failed to insert audit log:", error.message);
    }
  } catch (err) {
    console.error("Error in audit logging:", err);
  }
}
