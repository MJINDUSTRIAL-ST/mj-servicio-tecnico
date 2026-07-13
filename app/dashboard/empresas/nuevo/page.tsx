"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function NuevaEmpresaPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardarEmpresa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("Debes ingresar el nombre de la empresa.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("empresas").insert([
      {
        nombre: nombre.trim(),
        rut: rut.trim() || null,
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error guardando empresa: " + error.message);
      return;
    }

    alert("Empresa creada correctamente.");
    router.push("/dashboard/empresas");
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button
        onClick={() => router.push("/dashboard/empresas")}
        className="mb-6 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        ← Volver a Empresas
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Nueva Empresa</h1>

        <p className="mt-1 text-slate-500">
          Registra una empresa para luego asociar clientes/personas a ella.
        </p>
      </div>

      <form
        onSubmit={guardarEmpresa}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid gap-5">
          <Campo
            titulo="Nombre empresa *"
            valor={nombre}
            setValor={setNombre}
            placeholder="Ej: Patos SpA"
          />

          <Campo
            titulo="RUT empresa"
            valor={rut}
            setValor={setRut}
            placeholder="Ej: 76.123.456-7"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Luego podrás asociar clientes/contactos a esta empresa desde Nuevo
          Cliente.
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/empresas")}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar Empresa"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({
  titulo,
  valor,
  setValor,
  placeholder,
}: {
  titulo: string;
  valor: string;
  setValor: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {titulo}
      </label>

      <input
        type="text"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
      />
    </div>
  );
}