import { api } from "./api";
import type {
  AdminAuthUser,
  AdminLoginPayload,
  AdminRegisterPayload,
} from "../types/admin-auth";

export async function registerAdminUser(payload: AdminRegisterPayload) {
  const { data } = await api.post<AdminAuthUser>("/admin/auth/register", payload);
  return data;
}

export async function loginAdminUser(payload: AdminLoginPayload) {
  const { data } = await api.post<AdminAuthUser>("/admin/auth/login", payload);
  return data;
}