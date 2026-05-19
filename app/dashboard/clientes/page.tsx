"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Cliente = {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  rut?: string | null;
  empresa?: string | null;
  direccion?: string | null;
  codigo_acceso?: string | null;
};

type Orden = {
  id: string;
  codigo?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  problema_reportado?: string | null;
  observaciones_iniciales?: string | null;
  created_at?: string | null;
};

type Venta = {
  id: string;
  numero?: string | null;
  cliente_id?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  producto?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  fecha_venta?: string | null;
  created_at?: string | null;
  factura_url?: string | null;
  orden_compra_url?: string | null;
  ficha_tecnica_url?: string | null;
  manual_url?: string | null;
  certificado_url?: string | null;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteHistorial, setClienteHistorial] = useState<Cliente | null>(null);
  const [tabHistorial, setTabHistorial] = useState<"servicio" | "ventas">(
    "servicio"
  );

  const [ordenAbierta, setOrdenAbierta] = useState<string | null>(null);
  const [ventaAbierta, setVentaAbierta] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);

    const { data: clientesData } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true });

    const { data: ordenesData } = await supabase
      .from("ordenes")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: ventasData } = await supabase
      .from("ventas")
      .select("*")
      .order("created_at", { ascending: false });

    setClientes((clientesData || []) as Cliente[]);
    setOrdenes((ordenesData || []) as Orden[]);
    setVentas((ventasData || []) as Venta[]);
    setCargando(false);
  }

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return clientes;

    return clientes.filter((cliente) => {
      return (
        cliente.nombre?.toLowerCase().includes(texto) ||
        cliente.telefono?.toLowerCase().includes(texto) ||
        cliente.email?.toLowerCase().includes(texto) ||
        cliente.rut?.toLowerCase().includes(texto) ||
        cliente.empresa?.toLowerCase().includes(texto) ||
        cliente.codigo_acceso?.toLowerCase().includes(texto)
      );
    });
  }, [clientes, busqueda]);

  function ordenesDelCliente(cliente: Cliente) {
    return ordenes.filter((orden) => {
      const emailOrden = orden.cliente_email?.toLowerCase().trim();
      const emailCliente = cliente.email?.toLowerCase().trim();

      const nombreOrden = orden.cliente?.toLowerCase().trim();
      const nombreCliente = cliente.nombre?.toLowerCase().trim();

      return (
        (emailOrden && emailCliente && emailOrden === emailCliente) ||
        (nombreOrden && nombreCliente && nombreOrden === nombreCliente)
      );
    });
  }

  function ventasDelCliente(cliente: Cliente) {
    return ventas.filter((venta) => {
      const emailVenta = venta.cliente_email?.toLowerCase().trim();
      const emailCliente = cliente.email?.toLowerCase().trim();

      const nombreVenta = venta.cliente?.toLowerCase().trim();
      const nombreCliente = cliente.nombre?.toLowerCase().trim();

      return (
        venta.cliente_id === cliente.id ||
        (emailVenta && emailCliente && emailVenta === emailCliente) ||
        (nombreVenta && nombreCliente && nombreVenta === nombreCliente)
      );
    });
  }

  async function eliminarCliente(cliente: Cliente) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar a ${cliente.nombre}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", cliente.id);

    if (error) {
      alert("Error eliminando cliente: " + error.message);
      return;
    }

    setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
  }

  function abrirHistorial(cliente: Cliente) {
    setClienteHistorial(cliente);
    setTabHistorial("servicio");
    setOrdenAbierta(null);
    setVentaAbierta(null);
  }

  function formatFecha(fecha?: string | null) {
    if (!fecha) return "-";

    try {
      return new Date(fecha).toLocaleDateString("es-CL");
    } catch {
      return fecha;
    }
  }

  function colorEstado(estado?: string | null) {
    if (!estado) return { bg: "#e2e8f0", color: "#334155" };

    if (estado.includes("Cotiz")) return { bg: "#fef3c7", color: "#b45309" };
    if (estado.includes("Ingreso")) return { bg: "#dbeafe", color: "#2563eb" };
    if (estado.includes("Listo")) return { bg: "#dcfce7", color: "#15803d" };
    if (estado.includes("Entreg")) return { bg: "#dcfce7", color: "#15803d" };
    if (estado.includes("Repar")) return { bg: "#ffedd5", color: "#c2410c" };

    return { bg: "#e2e8f0", color: "#334155" };
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => window.history.back()}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Volver
        </button>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>

            <p className="mt-1 text-slate-500">
              {clientes.length} clientes registrados
            </p>
          </div>

          <Link
            href="/dashboard/clientes/nuevo"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Nuevo Cliente
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, teléfono, RUT, empresa o código..."
          className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        />

        {cargando ? (
          <div className="py-10 text-center text-slate-500">
            Cargando clientes...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            No se encontraron clientes.
          </div>
        ) : (
          <div className="space-y-3">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => abrirHistorial(cliente)}
                className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-blue-200 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {cliente.nombre}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                      <span>{cliente.telefono || "-"}</span>
                      <span>{cliente.email || "-"}</span>
                      <span>RUT: {cliente.rut || "-"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                      <span>{cliente.empresa || "-"}</span>
                      <span>{cliente.direccion || "-"}</span>
                    </div>

                    <p className="mt-3 text-sm font-bold text-slate-900">
                      Código acceso: {cliente.codigo_acceso || "-"}
                    </p>
                  </div>

                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setClienteEditando(cliente)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
                      title="Modificar cliente"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => eliminarCliente(cliente)}
                      className="rounded-lg border border-red-100 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      title="Eliminar cliente"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {clienteEditando && (
        <ModalEditarCliente
          cliente={clienteEditando}
          onCerrar={() => setClienteEditando(null)}
          onGuardado={(clienteActualizado) => {
            setClientes((prev) =>
              prev.map((cliente) =>
                cliente.id === clienteActualizado.id
                  ? clienteActualizado
                  : cliente
              )
            );
            setClienteEditando(null);
          }}
        />
      )}

      {clienteHistorial && (
        <div
          onClick={() => setClienteHistorial(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{clienteHistorial.nombre}</h2>
                <p className="text-sm text-slate-500">
                  {clienteHistorial.empresa || "Sin empresa registrada"}
                </p>
              </div>

              <button
                onClick={() => setClienteHistorial(null)}
                className="text-slate-400 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Órdenes</p>
                <p className="text-xl font-bold">
                  {ordenesDelCliente(clienteHistorial).length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Ventas</p>
                <p className="text-xl font-bold">
                  {ventasDelCliente(clienteHistorial).length}
                </p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setTabHistorial("servicio")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  tabHistorial === "servicio"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Servicio Técnico
              </button>

              <button
                onClick={() => setTabHistorial("ventas")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  tabHistorial === "ventas"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Ventas
              </button>
            </div>

            {tabHistorial === "servicio" ? (
              <div className="max-h-[460px] space-y-3 overflow-auto pr-1">
                {ordenesDelCliente(clienteHistorial).length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                    Este cliente no tiene órdenes registradas.
                  </div>
                ) : (
                  ordenesDelCliente(clienteHistorial).map((orden) => {
                    const abierta = ordenAbierta === orden.id;
                    const estado = colorEstado(orden.estado);

                    return (
                      <div
                        key={orden.id}
                        className="rounded-xl border border-slate-200 bg-white"
                      >
                        <button
                          onClick={() =>
                            setOrdenAbierta(abierta ? null : orden.id)
                          }
                          className="flex w-full items-center justify-between gap-3 p-4 text-left"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">
                                {orden.codigo || "Orden sin código"}
                              </p>

                              <span
                                className="rounded-full px-2 py-1 text-xs font-bold"
                                style={{
                                  backgroundColor: estado.bg,
                                  color: estado.color,
                                }}
                              >
                                {orden.estado || "-"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {orden.equipo || "-"}
                              {orden.marca ? ` · ${orden.marca}` : ""}
                              {orden.modelo ? ` ${orden.modelo}` : ""}
                            </p>
                          </div>

                          <span className="text-slate-400">
                            {abierta ? "⌃" : "›"}
                          </span>
                        </button>

                        {abierta && (
                          <div className="border-t border-slate-100 p-4 text-sm">
                            <div className="grid gap-2 text-slate-700">
                              <p>
                                <strong>Equipo:</strong> {orden.equipo || "-"}
                              </p>

                              <p>
                                <strong>Marca:</strong> {orden.marca || "-"}
                              </p>

                              <p>
                                <strong>Modelo:</strong> {orden.modelo || "-"}
                              </p>

                              <p>
                                <strong>Problema:</strong>{" "}
                                {orden.problema_reportado || "-"}
                              </p>

                              <p>
                                <strong>Observaciones:</strong>{" "}
                                {orden.observaciones_iniciales || "-"}
                              </p>

                              <p>
                                <strong>Fecha:</strong>{" "}
                                {formatFecha(orden.created_at)}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link
                                href={`/dashboard/servicio-tecnico/${orden.id}`}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                              >
                                Ver completo
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="max-h-[460px] space-y-3 overflow-auto pr-1">
                {ventasDelCliente(clienteHistorial).length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                    Este cliente no tiene ventas registradas.
                  </div>
                ) : (
                  ventasDelCliente(clienteHistorial).map((venta) => {
                    const abierta = ventaAbierta === venta.id;
                    const estado = colorEstado(venta.estado);

                    return (
                      <div
                        key={venta.id}
                        className="rounded-xl border border-slate-200 bg-white"
                      >
                        <button
                          onClick={() =>
                            setVentaAbierta(abierta ? null : venta.id)
                          }
                          className="flex w-full items-center justify-between gap-3 p-4 text-left"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold">
                                {venta.numero || "Venta sin número"}
                              </p>

                              <span
                                className="rounded-full px-2 py-1 text-xs font-bold"
                                style={{
                                  backgroundColor: estado.bg,
                                  color: estado.color,
                                }}
                              >
                                {venta.estado || "-"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {venta.producto || "-"}
                            </p>
                          </div>

                          <span className="text-slate-400">
                            {abierta ? "⌃" : "›"}
                          </span>
                        </button>

                        {abierta && (
                          <div className="border-t border-slate-100 p-4 text-sm">
                            <div className="grid gap-2 text-slate-700">
                              <p>
                                <strong>Producto:</strong>{" "}
                                {venta.producto || "-"}
                              </p>

                              <p>
                                <strong>Descripción:</strong>{" "}
                                {venta.descripcion || "-"}
                              </p>

                              <p>
                                <strong>Estado:</strong> {venta.estado || "-"}
                              </p>

                              <p>
                                <strong>Fecha:</strong>{" "}
                                {formatFecha(
                                  venta.fecha_venta || venta.created_at
                                )}
                              </p>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link
                                href={`/cliente/portal/mis-compras/${venta.numero}`}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                              >
                                Ver completo
                              </Link>

                              {venta.factura_url && (
                                <a
                                  href={venta.factura_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                                >
                                  Factura
                                </a>
                              )}

                              {venta.certificado_url && (
                                <a
                                  href={venta.certificado_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-lg border px-4 py-2 text-sm font-semibold"
                                >
                                  Certificado
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalEditarCliente({
  cliente,
  onCerrar,
  onGuardado,
}: {
  cliente: Cliente;
  onCerrar: () => void;
  onGuardado: (cliente: Cliente) => void;
}) {
  const [form, setForm] = useState<Cliente>(cliente);
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo: keyof Cliente, valor: string) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  async function guardar() {
    setGuardando(true);

    const { data, error } = await supabase
      .from("clientes")
      .update({
        nombre: form.nombre,
        telefono: form.telefono,
        email: form.email,
        rut: form.rut,
        empresa: form.empresa,
        direccion: form.direccion,
        codigo_acceso: form.codigo_acceso,
      })
      .eq("id", cliente.id)
      .select("*")
      .single();

    setGuardando(false);

    if (error) {
      alert("Error guardando cliente: " + error.message);
      return;
    }

    onGuardado(data as Cliente);
  }

  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Modificar cliente</h2>

            <p className="text-sm text-slate-500">
              Actualiza los datos del cliente.
            </p>
          </div>

          <button onClick={onCerrar} className="text-slate-400 hover:text-black">
            ×
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <CampoInput
            label="Nombre"
            value={form.nombre || ""}
            onChange={(v) => cambiar("nombre", v)}
          />

          <CampoInput
            label="Teléfono"
            value={form.telefono || ""}
            onChange={(v) => cambiar("telefono", v)}
          />

          <CampoInput
            label="Email"
            value={form.email || ""}
            onChange={(v) => cambiar("email", v)}
          />

          <CampoInput
            label="RUT"
            value={form.rut || ""}
            onChange={(v) => cambiar("rut", v)}
          />

          <CampoInput
            label="Empresa"
            value={form.empresa || ""}
            onChange={(v) => cambiar("empresa", v)}
          />

          <CampoInput
            label="Código acceso"
            value={form.codigo_acceso || ""}
            onChange={(v) => cambiar("codigo_acceso", v)}
          />
        </div>

        <div className="mt-4">
          <CampoInput
            label="Dirección"
            value={form.direccion || ""}
            onChange={(v) => cambiar("direccion", v)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="rounded-xl border px-5 py-3 font-semibold"
          >
            Cancelar
          </button>

          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampoInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}