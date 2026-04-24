import Link from "next/link";
import { ReactNode } from "react";

export default function ClientePortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="relative w-64 border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="rounded-xl border border-orange-200 bg-white p-4">
              <h1 className="text-2xl font-extrabold text-slate-900">
                MJ Industrial
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                maquinaria y equipos de izaje
              </p>
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
            </nav>
          </div>

          <div className="absolute bottom-6 left-6">
            <button className="text-sm text-slate-500 hover:text-slate-900">
              Cerrar sesión
            </button>
          </div>
        </aside>

        <section className="flex-1 px-10 py-10">{children}</section>
      </div>
    </main>
  );
}