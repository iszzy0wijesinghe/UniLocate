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

export type AdminRegisterPayload = {
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  roleKey: string;
};

export type AdminLoginPayload = {
  email: string;
  password: string;
};