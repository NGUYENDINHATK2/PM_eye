export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
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
  created_at: string;
};

export type SalaryHistory = {
  id: string;
  profile_id: string;
  monthly_amount: number;
  effective_from: string; // YYYY-MM-DD
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
  percent: number; // 0..1
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
