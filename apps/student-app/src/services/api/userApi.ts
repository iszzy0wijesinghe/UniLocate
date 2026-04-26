/** @format */

import { API_BASE_URL } from "./baseUrl";

export type RegisterUserRequest = {
  username: string;
  fullName?: string;
};

export type RegisterUserResponse = {
  id: string;
  username: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
};

export async function registerUser(input: RegisterUserRequest) {
  const res = await fetch(`${API_BASE_URL}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || "Failed to register user");
  }

  return data as RegisterUserResponse;
}