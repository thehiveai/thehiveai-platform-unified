"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Add more providers later (ThemeProvider, ReactQuery, etc.)
  return <SessionProvider>{children}</SessionProvider>;
}
