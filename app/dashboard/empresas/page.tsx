"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Empresa = {
  id: string;
  nombre: string;
  rut?: string | null;
  created_at?: string | null;
};

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);

  useEffect(() => {
    cargarEmpresas();
  }, []);

  async function cargarEmpresas() {
    setCargando(true);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      alert("Error cargando empresas: " + error.message);
      setCargando(false);
      return;
    }

    setEmpresas((data || []) as Empresa[]);
    setCargando(false);
  }

  const empresasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return empresas;

    return empresas.filter((empresa) => {
      return (
        empresa.nombre?.toLowerCase().includes(texto) ||
        empresa.rut?.toLowerCase().includes(texto)
      );
    });
  }, [empresas, busqueda]);

  async function eliminarEmpresa(empresa: Empresa) {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar la empresa ${empresa.nombre}?`
    );

    if (!confirmar) return;

    const { error: errorClientes } = await supabase
      .from("clientes")
      .update({
        empresa_id: null,
        empresa: null,
      })
      .eq("empresa_id", empresa.id);

    if (errorClientes) {
      alert("No se pudieron desasociar los clientes: " + errorClientes.message);
      return;
    }

    const { error: errorOrdenes } = await supabase
      .from("ordenes")
      .update({
        empresa_id: null,
      })
      .eq("empresa_id", empresa.id);

    if (errorOrdenes) {
      alert("No se pudieron desasociar las órdenes: " + errorOrdenes.message);
      return;
    }

    const { error } = await supabase
      .from("empresas")
      .delete()
      .eq("id", empresa.id);

    if (error) {
      alert("Error eliminando empresa: " + error.message);
      return;
    }

    setEmpresas((prev) => prev.filter((item) => item.id !== empresa.id));
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Volver al Dashboard
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Empresas</h1>

            <p className="mt-1 text-slate-500">
              {empresas.length} empresas registradas
            </p>
          </div>

          <Link
            href="/dashboard/empresas/nuevo"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Nueva Empresa
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o RUT..."
          className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        />

        {cargando ? (
          <div className="py-10 text-center text-slate-500">
            Cargando empresas...
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            No se encontraron empresas.
          </div>
        ) : (
          <div className="space-y-3">
            {empresasFiltradas.map((empresa) => (
              <article
                key={empresa.id}
                className="rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-blue-200 hover:bg-slate-50"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <Link
                    href={`/dashboard/empresas/${empresa.id}`}
                    className="min-w-0 flex-1"
                  >
                    <h2 className="text-xl font-bold text-slate-900">
                      {empresa.nombre}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      RUT: {empresa.rut || "-"}
                    </p>

                    <p className="mt-3 text-sm font-semibold text-blue-600">
                      Ver ficha, contactos e historial
                    </p>
                  </Link>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/empresas/${empresa.id}`}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Ver ficha
                    </Link>

                    <button
                      type="button"
                      onClick={() => setEmpresaEditando(empresa)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarEmpresa(empresa)}
                      className="rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {empresaEditando && (
        <ModalEditarEmpresa
          empresa={empresaEditando}
          onCerrar={() => setEmpresaEditando(null)}
          onGuardado={(empresaActualizada) => {
            setEmpresas((prev) =>
              prev.map((empresa) =>
                empresa.id === empresaActualizada.id
                  ? empresaActualizada
                  : empresa
              )
            );
            setEmpresaEditando(null);
          }}
        />
      )}
    </div>
  );
}

function ModalEditarEmpresa({
  empresa,
  onCerrar,
  onGuardado,
}: {
  empresa: Empresa;
  onCerrar: () => void;
  onGuardado: (empresa: Empresa) => void;
}) {
  const [nombre, setNombre] = useState(empresa.nombre || "");
  const [rut, setRut] = useState(empresa.rut || "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!nombre.trim()) {
      alert("Debes ingresar el nombre de la empresa.");
      return;
    }

    setGuardando(true);

    const { data, error } = await supabase
      .from("empresas")
      .update({
        nombre: nombre.trim(),
        rut: rut.trim() || null,
      })
      .eq("id", empresa.id)
      .select("*")
      .single();

    if (error) {
      setGuardando(false);
      alert("Error guardando empresa: " + error.message);
      return;
    }

    const { error: errorClientes } = await supabase
      .from("clientes")
      .update({
        empresa: nombre.trim(),
      })
      .eq("empresa_id", empresa.id);

    setGuardando(false);

    if (errorClientes) {
      alert(
        "La empresa se actualizó, pero no se pudo actualizar el nombre en sus clientes."
      );
    }

    onGuardado(data as Empresa);
  }

  return (
    <div
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Modificar empresa</h2>

            <p className="text-sm text-slate-500">
              Actualiza el nombre o RUT de la empresa.
            </p>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-black"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4">
          <CampoInput
            label="Nombre empresa"
            value={nombre}
            onChange={setNombre}
            placeholder="Ej: Patos SpA"
          />

          <CampoInput
            label="RUT empresa"
            value={rut}
            onChange={setRut}
            placeholder="Ej: 76.123.456-7"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border px-5 py-3 font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </div>
  );
}