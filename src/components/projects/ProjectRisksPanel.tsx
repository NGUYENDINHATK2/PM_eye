"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile, ProjectRisk, RiskKind, RiskSeverity } from "@/types/database";
import { AlertOctagon, Check, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function ProjectRisksPanel({
  projectId,
  profiles,
  canEdit,
  onChange,
}: {
  projectId: string;
  profiles: Profile[];
  canEdit: boolean;
  onChange?: (risks: ProjectRisk[]) => void;
}) {
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<RiskKind>("blocker");
  const [severity, setSeverity] = useState<RiskSeverity>("warn");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/project-risks?projectId=${encodeURIComponent(projectId)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(json.message || "Không tải được rủi ro");
      return;
    }
    setMissingTable(Boolean(json.missingTable));
    const list = (json.risks ?? []) as ProjectRisk[];
    setRisks(list);
    onChange?.(list);
  }, [projectId, onChange]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRisk() {
    if (!title.trim()) return;
    const res = await fetch("/api/project-risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        title,
        kind,
        severity,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.message || "Không thêm được");
      return;
    }
    setTitle("");
    toast.success("Đã thêm");
    void load();
  }

  async function toggleDone(r: ProjectRisk) {
    const res = await fetch("/api/project-risks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r.id,
        status: r.status === "open" ? "done" : "open",
      }),
    });
    if (!res.ok) {
      toast.error("Không cập nhật được");
      return;
    }
    void load();
  }

  async function remove(r: ProjectRisk) {
    if (!confirm(`Xóa "${r.title}"?`)) return;
    const res = await fetch(
      `/api/project-risks?id=${encodeURIComponent(r.id)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      toast.error("Không xóa được");
      return;
    }
    void load();
  }

  const open = risks.filter((r) => r.status === "open");
  const done = risks.filter((r) => r.status === "done");

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border/70">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-500" />
            Blocker / Rủi ro
          </h3>
          <p className="text-xs text-muted-foreground">
            {open.length} đang mở
            {done.length > 0 ? ` · ${done.length} đã xong` : ""}
          </p>
        </div>
      </div>

      {missingTable && (
        <p className="mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
          Chạy SQL <code className="font-mono">supabase/add_project_ops.sql</code>{" "}
          trên Supabase để bật bảng rủi ro.
        </p>
      )}

      {canEdit && !missingTable && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            placeholder="Mô tả ngắn…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 min-w-[160px] flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") void addRisk();
            }}
          />
          <Select value={kind} onValueChange={(v) => setKind(v as RiskKind)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blocker">Blocker</SelectItem>
              <SelectItem value="risk">Rủi ro</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={severity}
            onValueChange={(v) => setSeverity(v as RiskSeverity)}
          >
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="brand" className="h-9" onClick={() => void addRisk()}>
            <Plus className="!size-3.5" /> Thêm
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Đang tải…</p>
      ) : risks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Chưa có blocker / rủi ro.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...open, ...done].map((r) => {
            const owner = profiles.find((p) => p.id === r.owner_id);
            return (
              <li
                key={r.id}
                className={
                  r.status === "done"
                    ? "flex items-start gap-2 rounded-xl bg-muted/30 px-3 py-2.5 opacity-60 ring-1 ring-border/40"
                    : "flex items-start gap-2 rounded-xl bg-muted/20 px-3 py-2.5 ring-1 ring-border/50"
                }
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={
                        r.kind === "blocker" ? "destructive" : "warning"
                      }
                      className="py-0 text-[9px]"
                    >
                      {r.kind === "blocker" ? "Blocker" : "Risk"}
                    </Badge>
                    <Badge variant="secondary" className="py-0 text-[9px]">
                      {r.severity}
                    </Badge>
                    {r.status === "done" && (
                      <Badge variant="success" className="py-0 text-[9px]">
                        Done
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-medium">{r.title}</div>
                  {owner && (
                    <div className="text-[10px] text-muted-foreground">
                      {owner.full_name}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => void toggleDone(r)}
                      title={r.status === "open" ? "Đánh dấu xong" : "Mở lại"}
                    >
                      <Check className="!size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => void remove(r)}
                    >
                      <Trash2 className="!size-3.5 text-rose-500" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
