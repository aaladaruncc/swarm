"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { useTestNotifications } from "@/hooks/use-test-notifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Poll for completed tests and send notifications
  useTestNotifications();

  return (
    <div className="flex min-h-screen bg-white">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
