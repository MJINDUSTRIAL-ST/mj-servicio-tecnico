"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

type Retiro = {
  id: string;
  fecha_retiro: string;
  hora_retiro: string;
  estado: string;
};

const HORARIOS = ["11:00", "12:00", "15:00", "16:00"];

function esDiaHabil(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00`).getDay();
  return dia >= 1 && dia <= 5;
}

function fechaMinima() {
  return new Date().toISOString().split("T")[0];
}

export default function AgendarRetiroPage() {
  const params = useParams();
  const router = useRouter();

  const tipo = Array.isArray(params.tipo) ? params.tipo[0] : params.tipo;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [retirosOcupados, setRetirosOcupados] = useState<Retiro[]>([]);
  const [guardando, setGuardando] = useState(false);

  const clienteEmail =
    typeof window !== "undefined" ? localStorage.getItem("cliente_email") : null;

  useEffect(() => {
    if (fecha) {
      cargarHorariosOcupados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  async function cargarHorariosOcupados() {
    const { data, error } = await supabase
      .from("retiros")
      .select("*")
      .eq("fecha_retiro", fecha)
      .eq("estado", "Agendado");

    if (error) {
      console.error(error);
      setRetirosOcupados([]);
      return;
    }

    setRetirosOcupados((data || []) as Retiro[]);
  }

  const horariosOcupados = useMemo(() => {
    return retirosOcupados.map((r) => r.hora_retiro);
  }, [retirosOcupados]);

  async function confirmarRetiro() {
    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    if (!fecha) {
      alert("Selecciona una fecha de retiro.");
      return;
    }

    if (!esDiaHabil(fecha)) {
      alert("Los retiros solo están disponibles de lunes a viernes.");
      return;
    }

    if (!hora) {
      alert("Selecciona un horario.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("retiros").insert([
      {
        tipo,
        referencia_id: id,
        cliente_email: clienteEmail.trim().toLowerCase(),
        fecha_retiro: fecha,
        hora_retiro: hora,
        observaciones: observaciones.trim() || null,
        estado: "Agendado",
      },
    ]);

    if (error) {
      console.error(error);
      setGuardando(false);

      if (error.message.includes("duplicate")) {
        alert("Ese horario ya fue reservado. Selecciona otro horario.");
        await cargarHorariosOcupados();
        return;
      }

      alert("No se pudo agendar el retiro: " + error.message);
      return;
    }

    alert("Retiro agendado correctamente.");
    router.push(
      tipo === "venta"
        ? "/cliente/portal/mis-compras"
        : "/cliente/portal/servicio-tecnico"
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-bold">Agendar Retiro</h1>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-slate-500">Tipo:</p>
        <p className="font-semibold">{tipo}</p>

        <p className="mt-4 text-slate-500">ID:</p>
        <p className="font-semibold">{id}</p>

        <div className="mt-8">
          <label className="block text-sm font-semibold">Fecha de retiro</label>

          <input
            type="date"
            min={fechaMinima()}
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              setHora("");
            }}
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />

          {fecha && !esDiaHabil(fecha) ? (
            <p className="mt-2 text-sm font-semibold text-red-600">
              Solo puedes agendar retiros de lunes a viernes.
            </p>
          ) : null}
        </div>

        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold">Horario disponible</p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {HORARIOS.map((horario) => {
              const ocupado = horariosOcupados.includes(horario);
              const seleccionado = hora === horario;

              return (
                <button
                  key={horario}
                  type="button"
                  disabled={!fecha || ocupado || !esDiaHabil(fecha)}
                  onClick={() => setHora(horario)}
                  className={`rounded-xl border p-3 font-semibold transition ${
                    seleccionado
                      ? "border-blue-600 bg-blue-600 text-white"
                      : ocupado
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {horario}
                  {ocupado ? " ocupado" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <label className="block text-sm font-semibold">
            Observaciones para retiro
          </label>

          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: retira Juan Pérez, patente, teléfono, comentarios de bodega..."
            className="mt-2 min-h-[100px] w-full rounded-xl border border-slate-300 p-3"
          />
        </div>

        <button
          type="button"
          onClick={confirmarRetiro}
          disabled={guardando}
          className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardando ? "Agendando..." : "Confirmar retiro"}
        </button>
      </div>
    </div>
  );
}