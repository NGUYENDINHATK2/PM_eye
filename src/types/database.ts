export type AppRole = "admin" | "manager" | "pm" | "member";

export type DevLevel =
  | "Intern"
  | "Fresher"
  | "Junior"
  | "Middle"
  | "Senior"
  | "Lead"
  | "Principal";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  /** Chức danh: FE / BA / QA … */
  job_role: string;
  /** Quyền hệ thống */
  app_role: AppRole;
  /** Level kinh nghiệm: Intern → Principal */
  level: DevLevel;
  /** Lực chiến 1–100 — dùng phân bổ / so sánh sức mạnh */
  power_score: number;
  /** Chỉ có khi caller là admin; non-admin = 0 / omitted */
  base_salary: number;
  start_date: string;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
};

export type BillingType = "fixed" | "mm" | "tnm";

export type Project = {
  id: string;
  name: string;
  client: string | null;
  total_budget: number;
  consumed_before: number;
  revenue: number;
  billing_type: BillingType;
  mm_rate: number;
  status: "planned" | "ongoing" | "completed" | "paused";
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  color: string;
  /** PM phụ trách dự án */
  manager_id: string | null;
  /**
   * Độ khó = mức LC trung bình team cần có (0 = chưa set, 1–100).
   * Fit = (Σ power×% / Σ%) ÷ difficulty — cùng thang, ổn định.
   */
  difficulty: number;
  created_at: string;
};

export type SalaryHistory = {
  id: string;
  profile_id: string;
  monthly_amount: number;
  effective_from: string;
  note: string | null;
  created_at: string;
};

export type PaymentStatus = "planned" | "invoiced" | "paid";

export type ProjectPayment = {
  id: string;
  project_id: string;
  milestone_name: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
};

export type RequiredRole = { role: string; count: number };

export type ProjectPhase = {
  id: string;
  project_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_budget: number;
  required_roles: RequiredRole[];
  status: string;
  created_at: string;
};

export type Allocation = {
  id: string;
  user_id: string;
  project_id: string;
  phase_id: string | null;
  percent: number;
  start_date: string;
  end_date: string;
  note: string | null;
  created_at: string;
};

export type OperatingExpense = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  amount: number;
  description: string | null;
  category: string;
  spent_date: string;
  created_at: string;
};

/** Nhóm nhân sự — không gắn dự án */
export type Team = {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  color: string;
  created_at: string;
};

export type TeamMember = {
  team_id: string;
  user_id: string;
  created_at: string;
};
