import { API_BASE_URL } from "./baseUrl";

export type RegisterUserRequest = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type LoginUserRequest = {
  username: string;
  password: string;
};

export type AuthUserResponse = {
  id: string;
  username: string;
  created_at?: string;
  updated_at?: string;
};

export type CheckUsernameResponse = {
  available: boolean;
  message: string;
};

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function registerUser(input: RegisterUserRequest) {
  const res = await fetch(`${API_BASE_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to register user");
  }

  return data as AuthUserResponse;
}

export async function loginUser(input: LoginUserRequest) {
  const res = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to login");
  }

  return data as AuthUserResponse;
}

export async function checkUsernameAvailability(username: string) {
  const res = await fetch(
    `${API_BASE_URL}/users/check-username?username=${encodeURIComponent(
      username,
    )}`,
  );

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to check username");
  }

  return data as CheckUsernameResponse;
}

export type UpdateAccountDetailsRequest = {
  userId: string;
  username: string;
};

export type ResetPasswordRequest = {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function updateAccountDetails(input: UpdateAccountDetailsRequest) {
  const res = await fetch(`${API_BASE_URL}/users/update-account`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to update account");
  }

  return data as AuthUserResponse;
}

export async function resetPassword(input: ResetPasswordRequest) {
  const res = await fetch(`${API_BASE_URL}/users/reset-password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(data?.message || "Failed to reset password");
  }

  return data;
}