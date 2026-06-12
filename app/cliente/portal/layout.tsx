"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ClientePortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const cerrarSesion = async () => {
    localStorage.removeItem("cliente_id");
    localStorage.removeItem("cliente_email");
    localStorage.removeItem("cliente_nombre");

    await supabase.auth.signOut();

    router.push("/cliente");
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="relative w-64 border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="rounded-xl border border-orange-200 bg-white p-3">
              <Image
                src="/logo-cliente.png"
                alt="MJ Industrial"
                width={260}
                height={80}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>

          <div className="px-5 py-5">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Hola
            </p>

            <nav className="space-y-2">
              <Link
                href="/cliente/portal"
                className="block rounded-xl bg-blue-600 px-4 py-3 font-medium text-white"
              >
                Inicio
              </Link>

              <Link
                href="/cliente/portal/servicio-tecnico"
                className="block rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Servicio Técnico
              </Link>

              <Link
                href="/cliente/portal/mis-compras"
                className="block rounded-xl px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Mis Compras
              </Link>
              <Link
  href="/cliente/portal/proximos-vencimientos"
  className="ml-4 block rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
>
  Próximos vencimientos
</Link>
            </nav>
          </div>

          <div className="absolute bottom-6 left-6">
            <button
              type="button"
              onClick={cerrarSesion}
              className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-900"
>

              Cerrar sesión
            </button>
          </div>
        </aside>

        <section className="flex-1 px-10 py-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Volver atrás
          </button>

          {children}
        </section>
      </div>
    </main>
  );
}