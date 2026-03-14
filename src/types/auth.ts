export type AppRole = "admin" | "empleado";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: AppRole;
};
