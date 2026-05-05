"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Cliente = {
  id: string;
  nombre: string;
  email: string | null;
  empresa: string | null;
};

export default function NuevaOrden() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");

  const [codigo, setCodigo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [accesoriosEntregados, setAccesoriosEntregados] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [problemaReportado, setProblemaReportado] = useState("");
  const [observacionesIniciales, setObservacionesIniciales] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, email, empresa")
        .order("nombre", { ascending: true });

      setClientes(clientesData || []);

      const { data: ordenesData } = await supabase
        .from("ordenes")
        .select("codigo")
        .like("codigo", "OT-%");

      let mayorNumero = 0;

      (ordenesData || []).forEach((orden) => {
        const numero = Number(String(orden.codigo).replace("OT-", ""));
        if (!isNaN(numero) && numero > mayorNumero) {
          mayorNumero = numero;
        }
      });

      const siguienteNumero = mayorNumero + 1;
      setCodigo(`OT-${String(siguienteNumero).padStart(3, "0")}`);
    };

    cargarDatos();
  }, []);

  const subirFotos = async () => {
    if (fotos.length === 0) return "";

    const urls: string[] = [];

    for (const foto of fotos) {
      const extension = foto.name.split(".").pop();
      const nombreArchivo = `${codigo}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

      const { error } = await supabase.storage
        .from("ordenes-fotos")
        .upload(nombreArchivo, foto);

      if (error) {
        throw new Error(error.message);
      }

      const { data } = supabase.storage
        .from("ordenes-fotos")
        .getPublicUrl(nombreArchivo);

      urls.push(data.publicUrl);
    }

    return urls.join(",");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

    if (!clienteSeleccionado) {
      alert("Selecciona un cliente");
      return;
    }

    if (!clienteSeleccionado.email) {
      alert("El cliente no tiene email registrado");
      return;
    }

    if (!equipo || !problemaReportado) {
      alert("Completa los campos obligatorios");
      return;
    }

    setGuardando(true);

    try {
      const fotosUrl = await subirFotos();

      const { error } = await supabase.from("ordenes").insert([
        {
          codigo,
          cliente: clienteSeleccionado.nombre,
          cliente_email: clienteSeleccionado.email,
          equipo,
          estado: "Ingreso",
          prioridad,
          marca,
          modelo,
          numero_serie: numeroSerie,
          accesorios_entregados: accesoriosEntregados,
          problema_reportado: problemaReportado,
          observaciones_iniciales: observacionesIniciales,
          fotos_estado_inicial: fotosUrl,
        },
      ]);

      if (error) {
        alert("Error: " + error.message);
        setGuardando(false);
        return;
      }

      router.push("/dashboard/servicio-tecnico");
    } catch (error: any) {
      alert("Error subiendo fotos: " + error.message);
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 text-sm text-slate-500 hover:text-slate-900"
      >
        ← Volver
      </button>

      <h1 className="text-3xl font-bold text-slate-900">
        Nueva Orden de Servicio
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Registrar ingreso de equipo
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Cliente</h2>

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-3"
          >
            <option value="">Seleccionar cliente...</option>

            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
                {cliente.empresa ? ` — ${cliente.empresa}` : ""}
                {cliente.email ? ` (${cliente.email})` : ""}
              </option>
            ))}
          </select>

          {clientes.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              No hay clientes. Crear uno primero.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Equipo / Herramienta</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold">
              Código de orden
            </label>
            <input
              value={codigo}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-3 text-slate-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Tipo de Equipo *
              </label>
              <input
                placeholder="Ej: Taladro, soldadora, winche..."
                value={equipo}
                onChange={(e) => setEquipo(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Marca
              </label>
              <input
                placeholder="Marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Modelo
              </label>
              <input
                placeholder="Modelo"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Número de Serie
              </label>
              <input
                placeholder="S/N"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold">
              Accesorios Entregados
            </label>
            <input
              placeholder="Cable, maletín, baterías..."
              value={accesoriosEntregados}
              onChange={(e) => setAccesoriosEntregados(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold">
              Prioridad
            </label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            >
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Problema Reportado</h2>

          <label className="mb-1 block text-sm font-semibold">
            Descripción del problema *
          </label>
          <textarea
            placeholder="Describa el problema que presenta el equipo..."
            value={problemaReportado}
            onChange={(e) => setProblemaReportado(e.target.value)}
            required
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-3"
          />

          <label className="mb-1 mt-4 block text-sm font-semibold">
            Observaciones iniciales
          </label>
          <textarea
            placeholder="Estado visual, golpes, desgaste..."
            value={observacionesIniciales}
            onChange={(e) => setObservacionesIniciales(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-3"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-bold">Fotos del Estado Inicial</h2>

          <p className="mb-4 text-sm text-slate-500">
            Puedes subir 2 o más fotos del equipo al momento del ingreso.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
  <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center hover:bg-slate-50">
    <span className="block text-2xl">📷</span>
    <span className="mt-2 block font-semibold">Tomar foto ahora</span>
    <span className="mt-1 block text-sm text-slate-500">
      Abrirá la cámara del celular
    </span>

    <input
      type="file"
      accept="image/*"
      capture="environment"
      multiple
      onChange={(e) => setFotos(Array.from(e.target.files || []))}
      className="hidden"
    />
  </label>

  <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center hover:bg-slate-50">
    <span className="block text-2xl">🖼️</span>
    <span className="mt-2 block font-semibold">Subir desde galería</span>
    <span className="mt-1 block text-sm text-slate-500">
      Selecciona fotos guardadas
    </span>

    <input
      type="file"
      accept="image/*"
      multiple
      onChange={(e) => setFotos(Array.from(e.target.files || []))}
      className="hidden"
    />
  </label>
</div>

          {fotos.length > 0 && (
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p className="font-semibold">Fotos seleccionadas:</p>
              {fotos.map((foto, index) => (
                <p key={`${foto.name}-${index}`}>
                  {index + 1}. {foto.name}
                </p>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {guardando ? "Creando..." : "Crear Orden"}
          </button>
        </div>
      </form>
    </div>
  );
}