import { api } from "@/src/lib/http/client";

export type SuperAdminProfile = {
  id: number;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  displayName: string | null;
  email: string;
  mobileNumber: string | null;
  profilePhotoUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
};

export type ProfileUpdate = Pick<
  SuperAdminProfile,
  | "firstName"
  | "middleName"
  | "lastName"
  | "displayName"
  | "email"
  | "mobileNumber"
>;

export async function getSuperAdminProfile() {
  const { data } = await api.get("/api/users/me");
  return data.user as SuperAdminProfile;
}

export async function updateSuperAdminProfile(value: ProfileUpdate) {
  const { data } = await api.patch("/api/users/me", value);
  return data.user as SuperAdminProfile;
}

export async function uploadSuperAdminPhoto(file: File) {
  const payload = new FormData();
  payload.append("photo", file);
  const { data } = await api.post("/api/users/me/profile-photo", payload, {
    timeout: 30000,
  });
  return data.user as SuperAdminProfile;
}

export async function removeSuperAdminPhoto() {
  const { data } = await api.delete("/api/users/me/profile-photo");
  return data.user as SuperAdminProfile;
}

export async function changeSuperAdminPassword(
  currentPassword: string,
  newPassword: string,
) {
  await api.patch("/api/auth/change-password", {
    currentPassword,
    newPassword,
  });
}
