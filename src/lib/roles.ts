// Canonical role list used by Employees & Project required_roles.
// Add/remove here, both screens will reflect.

export const ROLE_OPTIONS = [
  // Leadership
  "BU Lead",
  "Tech Lead",
  "PM",
  "PO",
  "Scrum Master",
  // Analysis & Design
  "BA",
  "Comtor",
  "Designer",
  "UI/UX",
  // Engineering
  "Architect",
  "FE Dev",
  "BE Dev",
  "Fullstack",
  "Mobile",
  "DevOps",
  // Quality
  "QA",
  "QC",
  "Tester",
  // Data
  "Data Engineer",
  "Data Scientist",
  // Misc
  "Intern",
  "Other",
] as const;

export type RoleOption = (typeof ROLE_OPTIONS)[number];

// Optional grouping for nicer Select rendering later
export const ROLE_GROUPS: { label: string; roles: RoleOption[] }[] = [
  { label: "Leadership", roles: ["BU Lead", "Tech Lead", "PM", "PO", "Scrum Master"] },
  { label: "Analysis & Design", roles: ["BA", "Comtor", "Designer", "UI/UX"] },
  { label: "Engineering", roles: ["Architect", "FE Dev", "BE Dev", "Fullstack", "Mobile", "DevOps"] },
  { label: "Quality", roles: ["QA", "QC", "Tester"] },
  { label: "Data", roles: ["Data Engineer", "Data Scientist"] },
  { label: "Other", roles: ["Intern", "Other"] },
];
