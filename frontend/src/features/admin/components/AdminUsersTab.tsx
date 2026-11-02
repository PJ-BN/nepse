"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser, fetchAdminUsers, updateUserRole, updateUserStatus } from "../api";

export function AdminUsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: () => fetchAdminUsers(search || undefined, roleFilter || undefined),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: "admin" | "user" }) => updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setActionMsg("User role updated successfully.");
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) => updateUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setActionMsg("User account status updated.");
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setActionMsg("User deleted.");
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const handleDelete = (userId: number, email: string) => {
    if (confirm(`Are you sure you want to permanently delete user account: ${email}?`)) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/80 bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="user">Regular Members Only</option>
          </select>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-500 animate-in fade-in">
          ✓ {actionMsg}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 bg-muted/30 text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">User Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground animate-pulse">
                    Loading users…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-rose-500">
                    Failed to fetch users: {(error as Error).message}
                  </td>
                </tr>
              ) : !data?.users || data.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No users found matching your query.
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">#{u.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {/* Role Toggle */}
                      <button
                        onClick={() =>
                          roleMutation.mutate({
                            userId: u.id,
                            role: u.role === "admin" ? "user" : "admin",
                          })
                        }
                        className="rounded-lg border border-border/80 bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        {u.role === "admin" ? "Demote" : "Make Admin"}
                      </button>

                      {/* Status Toggle */}
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            userId: u.id,
                            isActive: !u.is_active,
                          })
                        }
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          u.is_active
                            ? "border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            : "border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {u.is_active ? "Suspend" : "Activate"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        className="rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
