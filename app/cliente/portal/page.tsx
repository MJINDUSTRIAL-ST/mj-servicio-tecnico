"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Orden = {
  id: string;
  estado: string;
};

type Compra = {
  id: string;
};

type Retiro = {
  id: string;
};

export default function ClientePortalHomePage() {
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteNombre, setClienteNombre] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const clienteId = localStorage.getItem("cliente_id");
      const clienteEmail = localStorage.getItem("cliente_email");
      const nombreGuardado = localStorage.getItem("cliente_nombre");

      if (!clienteId || !clienteEmail) {
        router.push("/cliente");
        return;
      }

      setClienteNombre(nombreGuardado || "");

      const email = clienteEmail.trim().toLowerCase();

      const { data: ordenesData } = await supabase
        .from("ordenes")
        .select("id, estado")
        .eq("cliente_email", email);

      setOrdenes((ordenesData || []) as Orden[]);

      const { data: comprasData } = await supabase
        .from("ventas")
        .select("id")
        .eq("cliente_email", email);

      setCompras((comprasData || []) as Compra[]);

      const { data: retirosData } = await supabase
        .from("retiros")
        .select("id")
        .eq("cliente_email", email)
        .eq("estado", "Agendado");

      setRetiros((retirosData || []) as Retiro[]);

      setLoading(false);
    };

    fetchData();
  }, [router]);

  const totalOrdenes = ordenes.length;
  const totalCompras = compras.length;
  const totalRetiros = retiros.length;

  const listoEntrega = ordenes.filter(
    (o) => o.estado === "Listo" || o.estado === "Listo p/Entrega"
  ).length;

  const cotizacion = ordenes.filter((o) => o.estado === "Cotización").length;

  const handleLogout = () => {
    localStorage.removeItem("cliente_id");
    localStorage.removeItem("cliente_email");
    localStorage.removeItem("cliente_nombre");

    router.push("/cliente");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Bienvenido{clienteNombre ? `, ${clienteNombre}` : ""} 👋
          </h1>

          <p className="mt-3 text-lg text-slate-500">
            MJ Industrial — Servicio Técnico Industrial
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="mt-8 rounded-2xl bg-blue-50 p-6 text-blue-900">
        <h2 className="text-2xl font-bold">¿Cómo usar el portal?</h2>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-base">
          <li>
            En <strong>Servicio Técnico</strong> puedes consultar el estado de
            tus equipos.
          </li>
          <li>
            En <strong>Mis Compras</strong> puedes revisar el historial de tus
            pedidos.
          </li>
          <li>
            En <strong>Retiros Agendados</strong> puedes revisar tus horarios de
            retiro programados.
          </li>
          <li>Haz clic en cualquier módulo para ver el detalle.</li>
        </ul>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Cargando...</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Link
            href="/cliente/portal/servicio-tecnico"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md"
          >
            <p className="text-sm font-semibold text-orange-500">
              Servicio Técnico
            </p>

            <h3 className="mt-3 text-3xl font-bold">{totalOrdenes}</h3>

            <p className="mt-2 text-slate-500">órdenes en total</p>

            <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Listo p/Entrega</span>
                <span className="font-semibold">{listoEntrega}</span>
              </div>

              <div className="mt-2 flex justify-between">
                <span>Cotización</span>
                <span className="font-semibold">{cotizacion}</span>
              </div>
            </div>
          </Link>

          <Link
            href="/cliente/portal/mis-compras"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md"
          >
            <p className="text-sm font-semibold text-blue-500">Mis Compras</p>

            <h3 className="mt-3 text-3xl font-bold">{totalCompras}</h3>

            <p className="mt-2 text-slate-500">compras en total</p>
          </Link>

          <Link
            href="/cliente/portal/retiros"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md"
          >
            <p className="text-sm font-semibold text-green-600">
              Retiros Agendados
            </p>

            <h3 className="mt-3 text-3xl font-bold">{totalRetiros}</h3>

            <p className="mt-2 text-slate-500">retiros programados</p>
          </Link>
        </div>
      )}
    </div>
  );
}