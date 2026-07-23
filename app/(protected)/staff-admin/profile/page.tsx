"use client";

import SuperAdminProfileModal from "../../admin/SuperAdminProfileModal";

export default function StaffAdminProfilePage() {
  return (
    <SuperAdminProfileModal
      embedded
      accountLabel="Admin"
      onUpdated={(profile) => {
        window.dispatchEvent(
          new CustomEvent("educassist-profile-updated", { detail: profile }),
        );
      }}
    />
  );
}
