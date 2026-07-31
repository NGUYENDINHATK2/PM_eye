import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gán thành viên cho team.
 * - Leader luôn nằm trong danh sách
 * - Mỗi người chỉ thuộc 1 team (xoá membership cũ trước)
 */
export async function syncTeamMembers(
  admin: SupabaseClient,
  teamId: string,
  leaderId: string | null,
  memberIds: string[]
): Promise<void> {
  const ids = new Set(memberIds.filter(Boolean));
  if (leaderId) ids.add(leaderId);
  const list = Array.from(ids);

  if (list.length > 0) {
    const { error: clearErr } = await admin
      .from("team_members")
      .delete()
      .in("user_id", list);
    if (clearErr) throw new Error(clearErr.message);
  }

  const { error: delErr } = await admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId);
  if (delErr) throw new Error(delErr.message);

  if (list.length === 0) return;

  const rows = list.map((user_id) => ({ team_id: teamId, user_id }));
  const { error: insErr } = await admin.from("team_members").insert(rows);
  if (insErr) throw new Error(insErr.message);
}
