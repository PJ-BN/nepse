import { Metadata } from "next";
import { AdminPortal } from "@/features/admin";

export const metadata: Metadata = {
  title: "Admin Control Center | NEPSE Analytics",
  description: "Global admin panel for user management, AI settings, data sources, and dynamic 4:00 PM schedules.",
};

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
      <AdminPortal />
    </main>
  );
}
