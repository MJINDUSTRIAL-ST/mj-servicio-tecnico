"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Empresa = {
  id: string;
  nombre: string;
  rut?: string | null;
  created_at?: string | null;
};

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  rut?: string | null;
  empresa?: string | null;
  empresa_id?: string | null;
  direccion?: string | null;
};

type Orden = {
  id: string;
  codigo?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  equipo?: string | null;
  estado?: string | null;
  created_at?: string | null;
  empresa_id?: string | null;
};

type Venta = {
  id: string;
  numero?: string | null;
  cliente_id?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  producto?: string | null;
  estado?: string | null;
  fecha_venta?: string | null;
  created_at?: string | null;
};

type Tab = "contactos" | "servicio" | "ventas";

const LIMITE_INICIAL = 5;

function unirPorId<T extends { id: string }>(...listas: T[][]) {
  const mapa = new Map<string, T>();

  listas.flat().forEach((item) => {
    mapa.set(item.id, item);
  });

  return Array.from(mapa.values());
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function normalizarEstado(estado?: string | null) {
  return estado?.trim() || "Sin estado";
}

function claseEstado(estado?: string | null) {
  const valor = (estado || "").toLowerCase();

  if (valor.includes("entreg")) return "bg-emerald-50 text-emerald-700";
  if (valor.includes("listo")) return "bg-green-50 text-green-700";
  if (valor.includes("trabajo") || valor.includes("repar"))
    return "bg-orange-50 text-orange-700";
  if (valor.includes("cotiz")) return "bg-yellow-50 text-yellow-700";
  if (valor.includes("diagn") || valor.includes("revision"))
    return "bg-blue-50 text-blue-700";

  return "bg-slate-100 text-slate-700";
}

export default function EmpresaDetallePage() {
  const params = useParams();
  const empresaId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [tab, setTab] = useState<Tab>("contactos");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarFicha();
  }, [empresaId]);

  useEffect(() => {
    setMostrarTodos(false);
  }, [tab]);

  async function cargarFicha() {
    if (!empresaId) return;

    setCargando(true);
    setError("");

    const { data: empresaData, error: empresaError } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();

    if (empresaError || !empresaData) {
      setError(empresaError?.message || "Empresa no encontrada.");
      setCargando(false);
      return;
    }

    const empresaActual = empresaData as Empresa;

    const [
      { data: clientesPorId, error: clientesIdError },
      { data: clientesPorNombre, error: clientesNombreError },
      { data: ordenesPorEmpresa, error: ordenesEmpresaError },
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaActual.id)
        .order("nombre", { ascending: true }),

      supabase
        .from("clientes")
        .select("*")
        .eq("empresa", empresaActual.nombre)
        .order("nombre", { ascending: true }),

      supabase
        .from("ordenes")
        .select(
          "id,codigo,cliente,cliente_email,equipo,estado,created_at,empresa_id"
        )
        .eq("empresa_id", empresaActual.id)
        .order("created_at", { ascending: false }),
    ]);

    if (clientesIdError || clientesNombreError || ordenesEmpresaError) {
      setError(
        clientesIdError?.message ||
          clientesNombreError?.message ||
          ordenesEmpresaError?.message ||
          "No se pudo cargar la ficha."
      );
      setCargando(false);
      return;
    }

    const contactos = unirPorId(
      (clientesPorId || []) as Cliente[],
      (clientesPorNombre || []) as Cliente[]
    );

    const emails = contactos
      .map((cliente) => cliente.email?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email));

    const idsClientes = contactos.map((cliente) => cliente.id);

    let ordenesPorContactos: Orden[] = [];
    let ventasPorIds: Venta[] = [];
    let ventasPorEmails: Venta[] = [];

    if (emails.length > 0) {
      const [{ data: ordenesEmail }, { data: ventasEmail }] = await Promise.all([
        supabase
          .from("ordenes")
          .select(
            "id,codigo,cliente,cliente_email,equipo,estado,created_at,empresa_id"
          )
          .in("cliente_email", emails)
          .order("created_at", { ascending: false }),

        supabase
          .from("ventas")
          .select(
            "id,numero,cliente_id,cliente,cliente_email,producto,estado,fecha_venta,created_at"
          )
          .in("cliente_email", emails)
          .order("created_at", { ascending: false }),
      ]);

      ordenesPorContactos = (ordenesEmail || []) as Orden[];
      ventasPorEmails = (ventasEmail || []) as Venta[];
    }

    if (idsClientes.length > 0) {
      const { data: ventasIds } = await supabase
        .from("ventas")
        .select(
          "id,numero,cliente_id,cliente,cliente_email,producto,estado,fecha_venta,created_at"
        )
        .in("cliente_id", idsClientes)
        .order("created_at", { ascending: false });

      ventasPorIds = (ventasIds || []) as Venta[];
    }

    const ordenesUnidas = unirPorId(
      (ordenesPorEmpresa || []) as Orden[],
      ordenesPorContactos
    ).sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );

    const ventasUnidas = unirPorId(ventasPorIds, ventasPorEmails).sort((a, b) =>
      String(b.fecha_venta || b.created_at || "").localeCompare(
        String(a.fecha_venta || a.created_at || "")
      )
    );

    setEmpresa(empresaActual);
    setClientes(contactos);
    setOrdenes(ordenesUnidas);
    setVentas(ventasUnidas);
    setCargando(false);
  }

  const listaActual = useMemo(() => {
    if (tab === "contactos") return clientes;
    if (tab === "servicio") return ordenes;
    return ventas;
  }, [tab, clientes, ordenes, ventas]);

  const cantidadOculta = Math.max(listaActual.length - LIMITE_INICIAL, 0);

  if (cargando) {
    return <main className="p-6 text-slate-500">Cargando empresa...</main>;
  }

  if (error || !empresa) {
    return (
      <main className="p-6">
        <Link href="/dashboard/empresas" className="text-blue-600">
          ← Volver a Empresas
        </Link>

        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">
          {error || "Empresa no encontrada."}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap gap-4">
        <Link
          href="/dashboard/empresas"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Volver a Empresas
        </Link>

        <Link
          href="/dashboard"
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          Volver al Dashboard
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-blue-600">Empresa</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {empresa.nombre}
            </h1>
            <p className="mt-2 text-slate-500">RUT: {empresa.rut || "-"}</p>
          </div>

          <Link
            href="/dashboard/clientes/nuevo"
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            + Nuevo contacto
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Resumen titulo="Contactos" valor={clientes.length} />
          <Resumen titulo="Órdenes de servicio" valor={ordenes.length} />
          <Resumen titulo="Ventas" valor={ventas.length} />
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          <TabButton
            activo={tab === "contactos"}
            onClick={() => setTab("contactos")}
          >
            Contactos
          </TabButton>

          <TabButton
            activo={tab === "servicio"}
            onClick={() => setTab("servicio")}
          >
            Servicio Técnico
          </TabButton>

          <TabButton activo={tab === "ventas"} onClick={() => setTab("ventas")}>
            Ventas
          </TabButton>
        </div>

        <div className="mt-5 space-y-3">
          {tab === "contactos" ? (
            clientes.length === 0 ? (
              <EstadoVacio texto="Esta empresa todavía no tiene contactos asociados." />
            ) : (
              clientes
                .slice(0, mostrarTodos ? clientes.length : LIMITE_INICIAL)
                .map((cliente) => (
                  <article
                    key={cliente.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {cliente.nombre}
                        </h2>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <span>{cliente.email || "Sin email"}</span>
                          <span>{cliente.telefono || "Sin teléfono"}</span>
                          <span>RUT: {cliente.rut || "-"}</span>
                        </div>
                      </div>

                      <Link
                        href="/dashboard/clientes"
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Abrir en Clientes
                      </Link>
                    </div>
                  </article>
                ))
            )
          ) : null}

          {tab === "servicio" ? (
            ordenes.length === 0 ? (
              <EstadoVacio texto="Esta empresa todavía no tiene órdenes de Servicio Técnico." />
            ) : (
              ordenes
                .slice(0, mostrarTodos ? ordenes.length : LIMITE_INICIAL)
                .map((orden) => (
                  <Link
                    key={orden.id}
                    href={`/dashboard/servicio-tecnico/${orden.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {orden.codigo || "Orden sin código"} ·{" "}
                          {orden.cliente || "Sin cliente"}
                        </h2>

                        <p className="mt-2 text-sm text-slate-600">
                          {orden.equipo || "Equipo sin registrar"}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Ingreso: {formatFecha(orden.created_at)}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${claseEstado(
                          orden.estado
                        )}`}
                      >
                        {normalizarEstado(orden.estado)}
                      </span>
                    </div>
                  </Link>
                ))
            )
          ) : null}

          {tab === "ventas" ? (
            ventas.length === 0 ? (
              <EstadoVacio texto="Esta empresa todavía no tiene ventas asociadas." />
            ) : (
              ventas
                .slice(0, mostrarTodos ? ventas.length : LIMITE_INICIAL)
                .map((venta) => (
                  <article
                    key={venta.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {venta.numero || "Venta sin número"} ·{" "}
                          {venta.cliente || "Sin cliente"}
                        </h2>

                        <p className="mt-2 text-sm text-slate-600">
                          {venta.producto || "Producto sin registrar"}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Fecha:{" "}
                          {formatFecha(venta.fecha_venta || venta.created_at)}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${claseEstado(
                          venta.estado
                        )}`}
                      >
                        {normalizarEstado(venta.estado)}
                      </span>
                    </div>
                  </article>
                ))
            )
          ) : null}
        </div>

        {listaActual.length > LIMITE_INICIAL ? (
          <button
            type="button"
            onClick={() => setMostrarTodos((actual) => !actual)}
            className="mt-4 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            {mostrarTodos ? "Ver menos" : `Ver más (${cantidadOculta})`}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function Resumen({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}

function TabButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
        activo
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {texto}
    </div>
  );
}