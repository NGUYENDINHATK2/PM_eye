import { PRIVATE_CACHE_HEADERS, requireApiUser, requireRole } from "@/lib/api-auth";
import { canAccessTeams, canWriteTeams } from "@/lib/rbac";
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

/** GET /api/teams */
export async function GET() {
  const ctx = await requireApiUser();
  if (ctx instanceof NextResponse) return ctx;

  const [teamsRes, membersRes] = await Promise.all([
    ctx.admin.from("teams").select("*").order("created_at", { ascending: false }),
    ctx.admin.from("team_members").select("*"),
  ]);

  if (teamsRes.error || membersRes.error) {
    return NextResponse.json(
      {
        error: "db_error",
        message: teamsRes.error?.message ?? membersRes.error?.message,
      },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }

  let teams = (teamsRes.data ?? []) as Team[];
  let members = (membersRes.data ?? []) as TeamMember[];

  if (!canAccessTeams(ctx.role)) {
    const myTeamIds = new Set(
      members.filter((m) => m.user_id === ctx.user.id).map((m) => m.team_id)
    );
    teams = teams.filter((t) => myTeamIds.has(t.id));
    members = members.filter((m) => myTeamIds.has(m.team_id));
  }

  return NextResponse.json(
    { teams, members },
    { headers: PRIVATE_CACHE_HEADERS }
  );
}

/** POST /api/teams — admin / manager */
export async function POST(req: Request) {
  const ctx = await requireRole(["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  if (!canWriteTeams(ctx.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as TeamBody;
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "bad_request", message: "Thiếu tên team." },
      { status: 400 }
    );
  }
  if (!body.leader_id) {
    return NextResponse.json(
      { error: "bad_request", message: "Mỗi team cần 1 leader." },
      { status: 400 }
    );
  }

  const { data: team, error } = await ctx.admin
    .from("teams")
    .insert({
      name,
      description: body.description?.trim() || null,
      leader_id: body.leader_id,
      color: body.color?.trim() || "#0d9488",
    })
    .select("*")
    .single();

  if (error || !team) {
    return NextResponse.json(
      { error: "db_error", message: error?.message ?? "insert failed" },
      { status: 500 }
    );
  }

  try {
    await syncTeamMembers(
      ctx.admin,
      team.id,
      body.leader_id,
      body.member_ids ?? []
    );
  } catch (e) {
    await ctx.admin.from("teams").delete().eq("id", team.id);
    return NextResponse.json(
      {
        error: "db_error",
        message: e instanceof Error ? e.message : "Không gán được thành viên.",
      },
      { status: 500 }
    );
  }

  const { data: members } = await ctx.admin
    .from("team_members")
    .select("*")
    .eq("team_id", team.id);

  return NextResponse.json(
    { team: team as Team, members: (members ?? []) as TeamMember[] },
    { status: 201, headers: PRIVATE_CACHE_HEADERS }
  );
}
