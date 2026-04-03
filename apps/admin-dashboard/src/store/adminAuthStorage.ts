/** @format */

export type AdminAuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  roleKey: string;
  roleName: string;
  isActive: boolean;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
};

const ADMIN_AUTH_STORAGE_KEY = "unilocate_admin_auth_user";

export function getAdminAuthUser(): AdminAuthUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AdminAuthUser;

    if (!parsed?.id || !parsed?.email) return null;

    return {
      id: parsed.id,
      firstName: parsed.firstName ?? "",
      lastName: parsed.lastName ?? "",
      fullName: parsed.fullName ?? "",
      email: parsed.email,
      roleKey: parsed.roleKey ?? "",
      roleName: parsed.roleName ?? "",
      isActive: Boolean(parsed.isActive),
      avatarUrl: parsed.avatarUrl ?? null,
      mustChangePassword: Boolean(parsed.mustChangePassword),
      passwordChangedAt: parsed.passwordChangedAt ?? null,
    };
  } catch (error) {
    console.error("Failed to read admin auth user from storage:", error);
    return null;
  }
}

export function setAdminAuthUser(user: AdminAuthUser) {
  localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearAdminAuthUser() {
  localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
}

export function isAdminAuthenticated() {
  return Boolean(getAdminAuthUser());
}