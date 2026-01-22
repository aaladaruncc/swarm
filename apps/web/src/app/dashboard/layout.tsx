"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { useTestNotifications } from "@/hooks/use-test-notifications";
import { ThemeProvider } from "@/contexts/theme-context";
import { useTheme } from "@/contexts/theme-context";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  
  return (
    <div className={`flex h-screen ${
      isLight ? "bg-neutral-50" : "bg-neutral-950"
    }`}>
      <DashboardSidebar />
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Poll for completed tests and send notifications
  useTestNotifications();

  return (
    <ThemeProvider>
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  );
}
