export type UserRole = "admin" | "editor" | "viewer";

export interface AuthUser {
  username: string;
  roles: UserRole[];
}
