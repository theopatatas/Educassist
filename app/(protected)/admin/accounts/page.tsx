"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRoundX,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/src/features/auth/hooks";
import { api } from "@/src/lib/http/client";
import {
  AdminMetricCard,
  AdminPanel,
  InsightState,
} from "../_components/AdminInsightsUI";

type AdminAccount = {
  id: number;
  email: string;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  mobileNumber?: string | null;
  role: string;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  createdBy?: { id: number; name: string; email: string } | null;
};
type AdminActivity = {
  id: number;
  action: string;
  details?: string | null;
  createdAt: string;
  actor?: { id: number; name: string } | null;
};
type SortKey = "name" | "email" | "status" | "createdAt" | "lastLoginAt";
type Notice = { type: "success" | "error"; message: string };
type ConfirmAction = {
  type: "activate" | "deactivate" | "delete" | "edit" | "create";
  accounts: AdminAccount[];
} | null;

const PAGE_SIZE = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dateLabel(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function adminName(account: AdminAccount) {
  return [account.firstName, account.middleName, account.lastName]
    .filter(Boolean)
    .join(" ");
}

function cleanName(value: string) {
  return value
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/(^|\s)[a-z]/g, (letter) => letter.toUpperCase());
}

function apiMessage(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { message?: string } } };
  return value.response?.data?.message || fallback;
}

export default function AdminAccountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [createdFilter, setCreatedFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);
  const [editAdmin, setEditAdmin] = useState<AdminAccount | null>(null);
  const [editFields, setEditFields] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    mobileNumber: "",
    email: "",
  });
  const [editError, setEditError] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionPassword, setActionPassword] = useState("");
  const [actionPasswordError, setActionPasswordError] = useState("");
  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const actionRequestInFlight = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    mobileNumber: "",
    email: "",
    password: "",
  });
  const [createErrors, setCreateErrors] = useState<
    Partial<Record<keyof typeof newAdmin, string>>
  >({});
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [accessError, setAccessError] = useState("");
  const [verifyingAccess, setVerifyingAccess] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get("/api/users");
      const rows = Array.isArray(data?.users) ? data.users : [];
      setAdmins(
        rows.filter(
          (account: AdminAccount) =>
            account.role?.toLowerCase() === "admin" &&
            String(account.id) !== String(user?.id),
        ),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (accessGranted) void loadAdmins();
  }, [accessGranted, loadAdmins]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!confirmAction || submitting) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setConfirmAction(null);
      setActionPassword("");
      setActionPasswordError("");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmAction, submitting]);

  const verifyAccess = async () => {
    if (!accessPassword || verifyingAccess) return;
    setVerifyingAccess(true);
    setAccessError("");
    try {
      await api.post("/api/auth/verify-password", { password: accessPassword });
      setAccessPassword("");
      setAccessGranted(true);
    } catch (requestError) {
      setAccessError(
        apiMessage(requestError, "Super Admin password verification failed."),
      );
    } finally {
      setVerifyingAccess(false);
    }
  };

  const activeCount = admins.filter((account) => account.isActive).length;
  const inactiveCount = admins.length - activeCount;
  const filteredAdmins = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = admins.filter((account) => {
      const created = account.createdAt?.slice(0, 10) ?? "";
      return (
        (!normalized ||
          account.email.toLowerCase().includes(normalized) ||
          adminName(account).toLowerCase().includes(normalized)) &&
        (!statusFilter ||
          (statusFilter === "active" ? account.isActive : !account.isActive)) &&
        (!roleFilter || account.role.toLowerCase() === roleFilter) &&
        (!createdFilter || created === createdFilter)
      );
    });
    return rows.sort((a, b) => {
      const values: Record<SortKey, [string, string]> = {
        name: [adminName(a), adminName(b)],
        email: [a.email, b.email],
        status: [String(a.isActive), String(b.isActive)],
        createdAt: [a.createdAt ?? "", b.createdAt ?? ""],
        lastLoginAt: [a.lastLoginAt ?? "", b.lastLoginAt ?? ""],
      };
      const [left, right] = values[sortKey];
      const compared = left.localeCompare(right);
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [
    admins,
    createdFilter,
    query,
    roleFilter,
    sortDirection,
    sortKey,
    statusFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE));
  const visibleAdmins = filteredAdmins.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => setPage(1), [query, statusFilter, roleFilter, createdFilter]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key)
      setSortDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const updateLocal = (updates: AdminAccount[]) => {
    const map = new Map(updates.map((account) => [account.id, account]));
    setAdmins((current) =>
      current.map((account) => map.get(account.id) ?? account),
    );
    setSelectedAdmin((current) =>
      current ? (map.get(current.id) ?? current) : null,
    );
  };

  const openProfile = async (account: AdminAccount) => {
    setSelectedAdmin(account);
    setAdminActivities([]);
    setActivitiesLoading(true);
    try {
      const [profileResponse, activityResponse] = await Promise.all([
        api.get(`/api/users/${account.id}`),
        api.get(`/api/users/${account.id}/activities`),
      ]);
      const profile = profileResponse.data?.user as AdminAccount;
      setSelectedAdmin(profile);
      updateLocal([profile]);
      setAdminActivities(
        Array.isArray(activityResponse.data?.activities)
          ? activityResponse.data.activities
          : [],
      );
    } catch (requestError) {
      setNotice({
        type: "error",
        message: apiMessage(
          requestError,
          "Administrator profile could not be loaded.",
        ),
      });
    } finally {
      setActivitiesLoading(false);
    }
  };

  const beginEdit = (account: AdminAccount) => {
    setEditAdmin(account);
    setEditFields({
      firstName: account.firstName ?? "",
      middleName: account.middleName ?? "",
      lastName: account.lastName ?? "",
      mobileNumber: account.mobileNumber ?? "",
      email: account.email,
    });
    setEditError("");
  };

  const saveEdit = async (passwordVerified = false) => {
    if (!editAdmin || submitting) return;
    const email = editFields.email.trim().toLowerCase();
    if (!editFields.firstName.trim() || !editFields.lastName.trim()) {
      setEditError("First name and last name are required.");
      return;
    }
    if (!/^09\d{9}$/.test(editFields.mobileNumber)) {
      setEditError("Mobile number must contain 11 digits beginning with 09.");
      return;
    }
    if (!emailPattern.test(email)) {
      setEditError("Enter a valid email address.");
      return;
    }
    if (!passwordVerified) {
      setConfirmAction({ type: "edit", accounts: [editAdmin] });
      setActionPassword("");
      setActionPasswordError("");
      return;
    }
    if (
      admins.some(
        (item) =>
          item.id !== editAdmin.id && item.email.toLowerCase() === email,
      )
    ) {
      setEditError("This email is already used by another administrator.");
      return;
    }
    setSubmitting(true);
    setEditError("");
    try {
      const { data } = await api.patch(`/api/users/${editAdmin.id}`, {
        firstName: editFields.firstName.trim(),
        middleName: editFields.middleName.trim() || null,
        lastName: editFields.lastName.trim(),
        mobileNumber: editFields.mobileNumber,
        email,
        superAdminPassword: actionPassword,
      });
      updateLocal([data.user as AdminAccount]);
      setEditAdmin(null);
      setNotice({
        type: "success",
        message: "Administrator updated successfully.",
      });
    } catch (requestError) {
      setEditError(apiMessage(requestError, "Administrator update failed."));
    } finally {
      setSubmitting(false);
    }
  };

  const createAdmin = async (passwordVerified = false) => {
    if (submitting) return;
    const email = newAdmin.email.trim().toLowerCase();
    const errors: Partial<Record<keyof typeof newAdmin, string>> = {};
    if (!newAdmin.firstName.trim())
      errors.firstName = "First name is required.";
    if (!newAdmin.lastName.trim()) errors.lastName = "Last name is required.";
    if (!/^09\d{9}$/.test(newAdmin.mobileNumber))
      errors.mobileNumber = "Enter 11 digits beginning with 09.";
    if (!emailPattern.test(email))
      errors.email = "Enter a valid email address.";
    else if (admins.some((account) => account.email.toLowerCase() === email))
      errors.email = "This email is already used by another administrator.";
    if (newAdmin.password.length < 8)
      errors.password = "Password must contain at least 8 characters.";
    setCreateErrors(errors);
    if (Object.keys(errors).length) return;
    if (!passwordVerified) {
      setConfirmAction({ type: "create", accounts: [] });
      setActionPassword("");
      setActionPasswordError("");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/api/users", {
        firstName: newAdmin.firstName.trim(),
        middleName: newAdmin.middleName.trim() || null,
        lastName: newAdmin.lastName.trim(),
        mobileNumber: newAdmin.mobileNumber,
        email,
        password: newAdmin.password,
        superAdminPassword: actionPassword,
      });
      setAdmins((current) => [data.user as AdminAccount, ...current]);
      setNewAdmin({
        firstName: "",
        middleName: "",
        lastName: "",
        mobileNumber: "",
        email: "",
        password: "",
      });
      setCreateOpen(false);
      setShowCreatePassword(false);
      setNotice({
        type: "success",
        message: "Administrator account created successfully.",
      });
    } catch (requestError) {
      setCreateErrors({
        email: apiMessage(requestError, "Administrator creation failed."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction || submitting || actionRequestInFlight.current) return;
    actionRequestInFlight.current = true;
    setSubmitting(true);
    setActionPasswordError("");
    try {
      await api.post("/api/auth/verify-password", { password: actionPassword });
      if (confirmAction.type === "edit") {
        setConfirmAction(null);
        setActionPassword("");
        await saveEdit(true);
        return;
      }
      if (confirmAction.type === "create") {
        setConfirmAction(null);
        setActionPassword("");
        await createAdmin(true);
        return;
      }
      if (confirmAction.type === "delete") {
        await Promise.all(
          confirmAction.accounts.map((account) =>
            api.delete(`/api/users/${account.id}`, {
              data: { superAdminPassword: actionPassword },
            }),
          ),
        );
        const removed = new Set(
          confirmAction.accounts.map((account) => account.id),
        );
        setAdmins((current) =>
          current.filter((account) => !removed.has(account.id)),
        );
        setSelectedAdmin(null);
      } else {
        const isActive = confirmAction.type === "activate";
        const results = await Promise.all(
          confirmAction.accounts.map((account) =>
            api.patch(`/api/users/${account.id}`, {
              isActive,
              superAdminPassword: actionPassword,
            }),
          ),
        );
        updateLocal(results.map((result) => result.data.user as AdminAccount));
      }
      setSelectedIds([]);
      setNotice({
        type: "success",
        message:
          confirmAction.type === "delete"
            ? "Administrator deleted successfully."
            : `Administrator account${confirmAction.accounts.length > 1 ? "s" : ""} ${confirmAction.type}d successfully.`,
      });
      setConfirmAction(null);
    } catch (requestError) {
      setActionPasswordError(
        apiMessage(requestError, "Super Admin password verification failed."),
      );
    } finally {
      actionRequestInFlight.current = false;
      setSubmitting(false);
    }
  };

  const selectedAccounts = admins.filter((account) =>
    selectedIds.includes(account.id),
  );
  const currentAdminId = String(user?.id ?? "");

  if (!accessGranted) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1500px] items-center justify-center p-4">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">
            Verify Super Admin Access
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your current Super Admin password before accessing
            administrator accounts.
          </p>
          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              void verifyAccess();
            }}
          >
            <label className="block text-sm font-medium text-slate-700">
              Super Admin Password
              <input
                type="password"
                value={accessPassword}
                onChange={(event) => {
                  setAccessPassword(event.target.value);
                  setAccessError("");
                }}
                autoComplete="current-password"
                autoFocus
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {accessError ? (
              <p className="mt-2 text-sm text-rose-600" role="alert">
                {accessError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.replace("/admin/dashboard")}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!accessPassword || verifyingAccess}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {verifyingAccess ? "Verifying…" : "Verify and Continue"}
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_button:not(:disabled)]:cursor-pointer">
      {notice ? (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
          role="status"
        >
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <p className="text-sm text-slate-600">
        Manage privileged administrator access and account status.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AdminMetricCard
          label="Total Admin Accounts"
          value={admins.length}
          description="Real administrator records"
          icon={UsersRound}
          href="/admin/accounts"
          loading={loading}
          tone="blue"
        />
        <AdminMetricCard
          label="Active Admins"
          value={activeCount}
          description="Accounts permitted to sign in"
          icon={ShieldCheck}
          href="/admin/accounts"
          loading={loading}
          tone="emerald"
        />
        <AdminMetricCard
          label="Inactive Admins"
          value={inactiveCount}
          description="Deactivated accounts"
          icon={UserRoundX}
          href="/admin/accounts"
          loading={loading}
          tone="amber"
        />
        <AdminMetricCard
          label="Suspended Admins"
          value={null}
          description="Status not supported by backend"
          icon={ShieldAlert}
          href="/admin/accounts"
          loading={loading}
          tone="rose"
        />
        <AdminMetricCard
          label="Newly Created Admins"
          value={null}
          description="Period definition unavailable"
          icon={UserCog}
          href="/admin/accounts"
          loading={loading}
          tone="violet"
        />
      </div>

      <AdminPanel
        title="Admin Directory"
        description="Search, filter, sort, and manage administrator accounts."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              disabled
              title="Export endpoints are unavailable"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-400 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create Admin
            </button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value.replace(/[^A-Za-z0-9 @._-]/g, ""))
              }
              placeholder="Search name or email"
              title="Letters, numbers, spaces, and valid email characters only"
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3"
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
          </select>
          <input
            type="date"
            aria-label="Filter by date created"
            value={createdFilter}
            onChange={(event) => setCreatedFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3"
          />
        </div>

        {selectedIds.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
            <b>{selectedIds.length} selected</b>
            <button
              onClick={() =>
                setConfirmAction({
                  type: "activate",
                  accounts: selectedAccounts,
                })
              }
              className="rounded-lg border bg-white px-3 py-1.5 hover:bg-emerald-50"
            >
              Activate
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  type: "deactivate",
                  accounts: selectedAccounts,
                })
              }
              className="rounded-lg border bg-white px-3 py-1.5 hover:bg-amber-50"
            >
              Deactivate
            </button>
            <button
              disabled
              title="Suspended status is not supported"
              className="rounded-lg border bg-white px-3 py-1.5 text-slate-400"
            >
              Suspend
            </button>
            <button
              disabled
              title="Bulk delete endpoint is unavailable"
              className="rounded-lg border bg-white px-3 py-1.5 text-slate-400"
            >
              Delete
            </button>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          {loading ? (
            <InsightState loading />
          ) : error ? (
            <div className="p-4">
              <InsightState error />
              <button
                onClick={() => void loadAdmins()}
                className="mx-auto mt-3 block rounded-xl border px-4 py-2"
              >
                Retry
              </button>
            </div>
          ) : visibleAdmins.length ? (
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select visible administrators"
                      checked={
                        visibleAdmins.some(
                          (item) => String(item.id) !== currentAdminId,
                        ) &&
                        visibleAdmins
                          .filter((item) => String(item.id) !== currentAdminId)
                          .every((item) => selectedIds.includes(item.id))
                      }
                      onChange={(event) =>
                        setSelectedIds((current) =>
                          event.target.checked
                            ? Array.from(
                                new Set([
                                  ...current,
                                  ...visibleAdmins
                                    .filter(
                                      (item) =>
                                        String(item.id) !== currentAdminId,
                                    )
                                    .map((item) => item.id),
                                ]),
                              )
                            : current.filter(
                                (id) =>
                                  !visibleAdmins.some((item) => item.id === id),
                              ),
                        )
                      }
                    />
                  </th>
                  {[
                    ["Full Name", "name"],
                    ["Email", "email"],
                    ["Role", "email"],
                    ["Status", "status"],
                    ["Date Created", "createdAt"],
                    ["Last Login", "lastLoginAt"],
                  ].map(([label, key]) => (
                    <th key={label} className="px-4 py-3">
                      <button
                        onClick={() => changeSort(key as SortKey)}
                        className="inline-flex items-center gap-1 font-semibold"
                      >
                        {label}
                        <ArrowDownUp className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleAdmins.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => void openProfile(account)}
                    className="hover:bg-slate-50"
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${account.email}`}
                        disabled={String(account.id) === currentAdminId}
                        checked={selectedIds.includes(account.id)}
                        onChange={() =>
                          setSelectedIds((current) =>
                            current.includes(account.id)
                              ? current.filter((id) => id !== account.id)
                              : [...current, account.id],
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {adminName(account) || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {account.email}
                    </td>
                    <td className="px-4 py-3 capitalize">{account.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dateLabel(account.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {dateLabel(account.lastLoginAt)}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex gap-1">
                        <button
                          onClick={() => void openProfile(account)}
                          className="rounded-lg p-2 hover:bg-slate-100"
                          aria-label="View profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => beginEdit(account)}
                          className="rounded-lg p-2 hover:bg-slate-100"
                          aria-label="Edit administrator"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: account.isActive
                                ? "deactivate"
                                : "activate",
                              accounts: [account],
                            })
                          }
                          disabled={String(account.id) === currentAdminId}
                          className="rounded-lg p-2 hover:bg-slate-100 disabled:text-slate-300"
                          aria-label={
                            account.isActive ? "Deactivate" : "Activate"
                          }
                        >
                          {account.isActive ? (
                            <LockKeyhole className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: "delete",
                              accounts: [account],
                            })
                          }
                          disabled={String(account.id) === currentAdminId}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
                          aria-label="Delete administrator"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <InsightState emptyLabel="No administrator accounts match the current filters." />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-slate-500">
            {filteredAdmins.length} administrator record
            {filteredAdmins.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              disabled={page === pageCount}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border p-2 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </AdminPanel>

      {selectedAdmin ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedAdmin(null)
          }
        >
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold uppercase tracking-wide text-slate-400">
                  Administrator Profile
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  {adminName(selectedAdmin) || selectedAdmin.email}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAdmin(null)}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <section className="mt-6 rounded-2xl border border-slate-200 p-4">
              <div className="flex justify-between">
                <h3 className="font-semibold">Account Information</h3>
                <button
                  onClick={() => {
                    beginEdit(selectedAdmin);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ["Full Name", adminName(selectedAdmin)],
                  ["Email", selectedAdmin.email],
                  ["Mobile Number", selectedAdmin.mobileNumber],
                  ["Role", selectedAdmin.role],
                  ["Status", selectedAdmin.isActive ? "Active" : "Inactive"],
                  ["Date Created", dateLabel(selectedAdmin.createdAt)],
                  ["Last Login", dateLabel(selectedAdmin.lastLoginAt)],
                  ["Created By", selectedAdmin.createdBy?.name],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {value || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
            <AdminPanel
              title="Security Information"
              description="Only backend-provided security fields are shown."
              className="mt-4"
            >
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Last Login</dt>
                  <dd className="font-medium">
                    {dateLabel(selectedAdmin.lastLoginAt)}
                  </dd>
                </div>
                {[
                  "Password Last Changed",
                  "Failed Login Attempts",
                  "Two-Factor Authentication",
                ].map((label) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="font-medium">—</dd>
                  </div>
                ))}
              </dl>
              <button
                disabled
                className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-slate-400"
              >
                <KeyRound className="h-4 w-4" />
                Reset Password unavailable
              </button>
            </AdminPanel>
            <AdminPanel
              title="Administrator Activity Log"
              description="Account changes recorded by the system."
              className="mt-4"
            >
              {activitiesLoading ? (
                <InsightState loading />
              ) : adminActivities.length ? (
                <ol className="space-y-3">
                  {adminActivities.map((activity) => (
                    <li
                      key={activity.id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {activity.action}
                        </p>
                        <time className="text-xs text-slate-500">
                          {dateLabel(activity.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {activity.actor?.name
                          ? `Performed by ${activity.actor.name}`
                          : "System activity"}
                        {activity.details ? ` · ${activity.details}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <InsightState emptyLabel="No administrator activity has been recorded yet." />
              )}
            </AdminPanel>
          </aside>
        </div>
      ) : null}

      {editAdmin ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">Edit Administrator</h2>
                <p className="mt-1 text-slate-500">
                  Update the administrator&apos;s personal information.
                </p>
              </div>
              <button onClick={() => setEditAdmin(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["firstName", "First Name"],
                  ["middleName", "Middle Name (Optional)"],
                  ["lastName", "Last Name"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="font-medium text-slate-600">
                  {label}
                  <input
                    value={editFields[key]}
                    onChange={(event) => {
                      setEditFields((current) => ({
                        ...current,
                        [key]: cleanName(event.target.value),
                      }));
                      setEditError("");
                    }}
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              ))}
              <label className="font-medium text-slate-600">
                Mobile Number
                <input
                  inputMode="numeric"
                  value={editFields.mobileNumber}
                  onChange={(event) => {
                    setEditFields((current) => ({
                      ...current,
                      mobileNumber: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11),
                    }));
                    setEditError("");
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="font-medium text-slate-600 sm:col-span-2">
                Email
                <input
                  type="email"
                  value={editFields.email}
                  onChange={(event) => {
                    setEditFields((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    setEditError("");
                  }}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            {editError ? (
              <p className="mt-2 text-rose-600">{editError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditAdmin(null)}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={() => void saveEdit()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget || submitting) return;
            setConfirmAction(null);
            setActionPassword("");
            setActionPasswordError("");
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-xl font-semibold capitalize">
              Confirm {confirmAction.type}
            </h2>
            <p className="mt-2 text-slate-600">
              Enter your Super Admin password to confirm this action. No changes
              occur until you press Confirm.
            </p>
            <label className="mt-4 block font-medium text-slate-600">
              Super Admin Password
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={actionPassword}
                onChange={(event) => {
                  setActionPassword(event.target.value);
                  setActionPasswordError("");
                }}
                onKeyDown={(event) =>
                  event.key === "Enter" &&
                  actionPassword &&
                  void executeConfirmedAction()
                }
                placeholder="Enter your password"
                className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
            {actionPasswordError ? (
              <p role="alert" className="mt-2 text-sm text-rose-600">
                {actionPasswordError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                disabled={submitting}
                onClick={() => {
                  setConfirmAction(null);
                  setActionPassword("");
                  setActionPasswordError("");
                }}
                className="rounded-xl border px-4 py-2"
              >
                Cancel
              </button>
              <button
                disabled={submitting || !actionPassword}
                onClick={() => void executeConfirmedAction()}
                className={`rounded-xl px-4 py-2 text-white disabled:opacity-40 ${confirmAction.type === "delete" ? "bg-rose-600" : "bg-slate-900"}`}
              >
                {submitting ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">Create Admin Account</h2>
                <p className="mt-1 text-slate-500">
                  Create secure credentials for a new administrator.
                </p>
              </div>
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setShowCreatePassword(false);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["firstName", "First Name", "Enter first name"],
                  ["middleName", "Middle Name (Optional)", "Enter middle name"],
                  ["lastName", "Last Name", "Enter last name"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className="font-medium text-slate-600">
                  {label}
                  <input
                    value={newAdmin[key]}
                    onChange={(event) => {
                      setNewAdmin((current) => ({
                        ...current,
                        [key]: cleanName(event.target.value),
                      }));
                      setCreateErrors((current) => ({
                        ...current,
                        [key]: undefined,
                      }));
                    }}
                    placeholder={placeholder}
                    title="Letters and spaces only; each name starts with a capital letter"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  {createErrors[key] ? (
                    <span className="mt-1 block text-rose-600">
                      {createErrors[key]}
                    </span>
                  ) : null}
                </label>
              ))}
              <label className="font-medium text-slate-600">
                Mobile Number
                <input
                  type="tel"
                  inputMode="numeric"
                  value={newAdmin.mobileNumber}
                  onChange={(event) => {
                    setNewAdmin((current) => ({
                      ...current,
                      mobileNumber: event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 11),
                    }));
                    setCreateErrors((current) => ({
                      ...current,
                      mobileNumber: undefined,
                    }));
                  }}
                  maxLength={11}
                  placeholder="Enter 11-digit mobile number"
                  title="11 digits beginning with 09"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
                {createErrors.mobileNumber ? (
                  <span className="mt-1 block text-rose-600">
                    {createErrors.mobileNumber}
                  </span>
                ) : null}
              </label>
              <label className="font-medium text-slate-600 sm:col-span-2">
                Email
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(event) => {
                    setNewAdmin((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    setCreateErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                  }}
                  autoComplete="off"
                  placeholder="Enter administrator email"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-slate-200"
                />
                {createErrors.email ? (
                  <span className="mt-1 block text-rose-600">
                    {createErrors.email}
                  </span>
                ) : null}
              </label>
              <label className="font-medium text-slate-600 sm:col-span-2">
                Password
                <div className="relative mt-1">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={newAdmin.password}
                    onChange={(event) => {
                      setNewAdmin((current) => ({
                        ...current,
                        password: event.target.value,
                      }));
                      setCreateErrors((current) => ({
                        ...current,
                        password: undefined,
                      }));
                    }}
                    autoComplete="new-password"
                    placeholder="Enter secure password"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-11 outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword((value) => !value)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label={
                      showCreatePassword ? "Hide password" : "Show password"
                    }
                    title={
                      showCreatePassword ? "Hide password" : "Show password"
                    }
                  >
                    {showCreatePassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {createErrors.password ? (
                  <span className="mt-1 block text-rose-600">
                    {createErrors.password}
                  </span>
                ) : null}
              </label>
              <label className="font-medium text-slate-600 sm:col-span-2">
                Admin Role
                <input
                  disabled
                  value="Admin"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-500"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setCreateErrors({});
                  setShowCreatePassword(false);
                }}
                className="rounded-xl border px-4 py-2"
              >
                Close
              </button>
              <button
                disabled={submitting}
                onClick={() => void createAdmin()}
                className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-40"
              >
                {submitting ? "Creating…" : "Create Admin"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
