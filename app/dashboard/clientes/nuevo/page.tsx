"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function NuevoClientePage() {
  const router = useRouter();

  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [rut, setRut] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigoAcceso, setCodigoAcceso] = useState("");

  async function guardarCliente(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!nombre.trim()) {
      alert("Debes ingresar el nombre del cliente");
      return;
    }

    try {
      setGuardando(true);

      const { error } = await supabase
        .from("clientes")
        .insert([
          {
            nombre: nombre.trim(),
            telefono: telefono.trim() || null,
            email:
              email.trim().toLowerCase() ||
              null,
            rut: rut.trim() || null,
            empresa:
              empresa.trim() || null,
            direccion:
              direccion.trim() || null,
            codigo_acceso:
              codigoAcceso.trim() || null,
          },
        ]);

      if (error) {
        console.error(error);
        alert(
          "Error al guardar cliente: " +
            error.message
        );
        return;
      }

      alert("Cliente creado correctamente");

      router.push(
        "/dashboard/clientes"
      );
    } catch (error) {
      console.error(error);
      alert(
        "Ocurrió un error al guardar el cliente"
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        onClick={() =>
          router.push(
            "/dashboard/clientes"
          )
        }
        className="mb-6 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        ← Volver
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Nuevo Cliente
        </h1>

        <p className="mt-1 text-slate-500">
          Ingresa los datos del
          cliente para servicio técnico
          y ventas.
        </p>
      </div>

      <form
        onSubmit={guardarCliente}
        className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Campo
            titulo="Nombre del cliente *"
            valor={nombre}
            setValor={setNombre}
            placeholder="Ej: Nicolas Melej"
          />

          <Campo
            titulo="Teléfono"
            valor={telefono}
            setValor={setTelefono}
            placeholder="+56 9 9999 9999"
          />

          <Campo
            titulo="Correo electrónico"
            valor={email}
            setValor={setEmail}
            placeholder="correo@empresa.cl"
          />

          <Campo
            titulo="RUT"
            valor={rut}
            setValor={setRut}
            placeholder="12.345.678-9"
          />

          <Campo
            titulo="Empresa"
            valor={empresa}
            setValor={setEmpresa}
            placeholder="MJ Industrial"
          />

          <Campo
            titulo="Código acceso"
            valor={codigoAcceso}
            setValor={setCodigoAcceso}
            placeholder="MJ1234"
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Dirección
          </label>

          <textarea
            value={direccion}
            onChange={(e) =>
              setDireccion(
                e.target.value
              )
            }
            placeholder="Dirección del cliente"
            className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/clientes"
              )
            }
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando
              ? "Guardando..."
              : "Guardar Cliente"}
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
  setValor: (
    value: string
  ) => void;
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
        onChange={(e) =>
          setValor(
            e.target.value
          )
        }
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500"
      />
    </div>
  );
}