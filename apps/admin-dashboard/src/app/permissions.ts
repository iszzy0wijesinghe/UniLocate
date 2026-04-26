/** @format */

export function getLandingPath(roleKey?: string) {
  const role = String(roleKey || "").toUpperCase();

  if (role === "SUPER_ADMIN") return "/dashboard";
  if (role === "BUILDING_ADMIN") return "/buildings";
  if (role === "LOST_FOUND_ADMIN") return "/lost-found";
  if (role === "COMPLAINT_ADMIN") return "/complaints";
  if (role === "USER_ADMIN") return "/users";

  return "/dashboard";
}

export function canAccessPath(roleKey: string, path: string) {
  const role = String(roleKey || "").toUpperCase();

  if (role === "SUPER_ADMIN") return true;

  const allowedPaths: Record<string, string[]> = {
    BUILDING_ADMIN: ["/dashboard", "/buildings"],
    LOST_FOUND_ADMIN: ["/dashboard", "/lost-found"],
    COMPLAINT_ADMIN: ["/dashboard", "/complaints"],
    USER_ADMIN: ["/dashboard", "/users"],
  };

  return (allowedPaths[role] ?? []).includes(path);
}

export function canManageAdminUsers(roleKey?: string) {
  const role = String(roleKey || "").toUpperCase();
  return role === "SUPER_ADMIN" || role === "USER_ADMIN";
}