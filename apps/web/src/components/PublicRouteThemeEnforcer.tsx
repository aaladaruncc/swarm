"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * On public routes (landing + login), always use light mode so the sign-in
 * and hero never show dark theme from a previous logged-in session.
 */
export function PublicRouteThemeEnforcer() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/" || pathname === "/login") {
      document.documentElement.classList.remove("dark");
    }
  }, [pathname]);

  return null;
}
