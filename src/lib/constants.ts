export interface AppUser {
  name: string;
  role: "admin" | "director";
  email: string;
  pin: string;
}

export const USERS: AppUser[] = [
  { name: "Admin", role: "admin", email: "admin@company.local", pin: "9999" },
  { name: "Jayesh Gogri", role: "director", email: "jayesh@company.local", pin: "3090" },
  { name: "Prerana Shah", role: "director", email: "prerana@company.local", pin: "2586" },
  { name: "Prasanna Sudke", role: "director", email: "prasanna@company.local", pin: "1709" },
];

export const DIRECTORS = USERS.filter((u) => u.role === "director").map((u) => u.name);
