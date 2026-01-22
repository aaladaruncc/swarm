"use client";

import { ThemeProvider } from "@/contexts/theme-context";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
