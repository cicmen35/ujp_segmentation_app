export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type UserListItem = {
  username: string;
  role: UserRole;
};
