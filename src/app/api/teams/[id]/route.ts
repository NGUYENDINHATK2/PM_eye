import { PRIVATE_CACHE_HEADERS, requireRole } from "@/lib/api-auth";
import { canWriteTeams } from "@/lib/rbac";
import { syncTeamMembers } from "@/lib/teams";
import type { Team, TeamMember } from "@/types/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TeamBody = {
  name?: string;
  description?: string | null;
  leader_id?: string | null;
  color?: string;
  member_ids?: string[];
};

/** PATCH /api/teams/:id */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole(["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  if (!canWriteTeams(ctx.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as TeamBody;

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "bad_request", message: "Tên team không được trống." },
        { status: 400 }
      );
    }
    patch.name = name;
  }
  if (body.description !== undefined) {
    patch.description = body.description?.trim() || null;
  }
  if (body.color !== undefined) {
    patch.color = body.color.trim() || "#0d9488";
  }
  if (body.leader_id !== undefined) {
    if (!body.leader_id) {
      return NextResponse.json(
        { error: "bad_request", message: "Mỗi team cần 1 leader." },
        { status: 400 }
      );
    }
    patch.leader_id = body.leader_id;
  }

  let team: Team | null = null;
  if (Object.keys(patch).length > 0) {
    const { data, error } = await ctx.admin
      .from("teams")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "db_error", message: error?.message ?? "update failed" },
        { status: 500 }
      );
    }
    team = data as Team;
  } else {
    const { data, error } = await ctx.admin
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "not_found", message: "Team không tồn tại." },
        { status: 404 }
      );
    }
    team = data as Team;
  }

  if (body.member_ids !== undefined || body.leader_id !== undefined) {
    let memberIds = body.member_ids;
    if (memberIds === undefined) {
      const { data } = await ctx.admin
        .from("team_members")
        .select("user_id")
        .eq("team_id", id);
      memberIds = (data ?? []).map((r) => r.user_id as string);
    }
    try {
      await syncTeamMembers(ctx.admin, id, team.leader_id, memberIds);
    } catch (e) {
      return NextResponse.json(
        {
          error: "db_error",
          message:
            e instanceof Error ? e.message : "Không cập nhật thành viên.",
        },
        { status: 500 }
      );
    }
  }

  const { data: members } = await ctx.admin
    .from("team_members")
    .select("*")
    .eq("team_id", id);

  return NextResponse.json(
    { team, members: (members ?? []) as TeamMember[] },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

/** DELETE /api/teams/:id */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireRole(["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  if (!canWriteTeams(ctx.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await ctx.admin.from("teams").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { headers: PRIVATE_CACHE_HEADERS });
}
