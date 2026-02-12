"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();

    if (token) {
      // Already logged in → go to workspaces
      router.replace("/workspaces");
    } else {
      // Not logged in → go to login page
      router.replace("/login");
    }
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-slate-500">Redirecting…</p>
    </main>
  );
}