/** @format */

import axios from "axios";
import { getAdminAuthUser } from "../store/adminAuthStorage";

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const adminUser = getAdminAuthUser();

  if (adminUser) {
    config.headers["x-admin-user-id"] = adminUser.id;
    config.headers["x-admin-username"] = adminUser.fullName;
    config.headers["x-admin-email"] = adminUser.email;
    config.headers["x-admin-role-key"] = adminUser.roleKey;
  }

  return config;
});