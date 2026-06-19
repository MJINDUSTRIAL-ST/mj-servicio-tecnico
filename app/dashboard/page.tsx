"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/servicio-tecnico");
  }, [router]);

  return (
    <main className="p-8">
      <p className="text-slate-500">Cargando Dashboard...</p>
    </main>
  );
}