"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId?: string;
  equipos?: any[];
  onEstadoActualizado?: (estado: string) => void;
};

type Equipo = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type RepuestoUtilizado = {
  id: string;
  cantidad: number;
  descripcion: string;
  observacion: string;
};

type FotoEgreso = {
  id: string;
  nombre: string;
  url: string;
};

type DocumentoTrabajo = {
  id: string;
  tipo: "Certificado" | "Test de carga" | "Manual" | "Ficha técnica" | "Otro";
  nombre: string;
  comentario: string;
  url: string;
};

type TrabajoEquipo = {
  trabajo_realizado: string;
  repuestos_utilizados: RepuestoUtilizado[];
  horas_reales: string;
  observaciones: string;
  prueba_funcional: boolean;
  prueba_carga: boolean;
  equipo_liberado: boolean;
  fotos_egreso: FotoEgreso[];
  documentos: DocumentoTrabajo[];
  guardando: boolean;
  guardadoOk: boolean;
};

function crearId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trabajoVacio(): TrabajoEquipo {
  return {
    trabajo_realizado: "",
    repuestos_utilizados: [],
    horas_reales: "",
    observaciones: "",
    prueba_funcional: false,
    prueba_carga: false,
    equipo_liberado: false,
    fotos_egreso: [],
    documentos: [],
    guardando: false,
    guardadoOk: false,
  };
}

function identificadorEquipo(equipo: Equipo) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function repuestosDesdeTexto(texto?: string) {
  if (!texto) return [];

  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const match = linea.match(/^(\d+(?:[.,]\d+)?)\s*x\s*(.+)$/i);

      return {
        id: crearId(),
        cantidad: match ? Number(match[1].replace(",", ".")) || 1 : 1,
        descripcion: match ? match[2].trim() : linea,
        observacion: "",
      };
    });
}

function generarTrabajoBase(equipoId: string) {
  const data = obtenerEquipoTrabajo(equipoId);

  const trabajoRealizado =
    data.trabajo?.trabajo_realizado ||
    data.revision?.procedimiento_aprobado ||
    data.diagnostico?.procedimiento ||
    "";

  const repuestosTexto =
    data.trabajo?.repuestos_utilizados ||
    data.revision?.repuestos_aprobados ||
    data.diagnostico?.repuestos ||
    "";

  return {
    trabajo_realizado: trabajoRealizado,
    repuestos_utilizados: Array.isArray(data.trabajo?.repuestos_utilizados)
      ? data.trabajo?.repuestos_utilizados
      : repuestosDesdeTexto(repuestosTexto as string),
    horas_reales:
      (data.trabajo as any)?.horas_reales ||
      data.revision?.horas_hombre?.toString() ||
      "",
    observaciones: data.trabajo?.observaciones || "",
    prueba_funcional: Boolean(data.trabajo?.prueba_funcional),
    prueba_carga: Boolean(data.trabajo?.prueba_carga),
    equipo_liberado: Boolean(data.trabajo?.equipo_liberado),
    fotos_egreso: ((data.trabajo as any)?.fotos_egreso || []) as FotoEgreso[],
    documentos: ((data.trabajo as any)?.documentos || []) as DocumentoTrabajo[],
  };
}

function archivoADataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function TrabajoOT({
  ordenId,
  equipos: equiposIniciales,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [trabajos, setTrabajos] = useState<Record<string, TrabajoEquipo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    if (!ordenId) return;

    setLoading(true);

    try {
      const { data: hijos } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie")
        .eq("orden_padre_id", ordenId)
        .order("codigo", { ascending: true });

      let equiposBase: Equipo[] = hijos || [];

      if (!equiposBase.length) {
        const { data: orden } = await supabase
          .from("ordenes")
          .select("id,codigo,equipo,marca,modelo,numero_serie")
          .eq("id", ordenId)
          .single();

        if (orden) equiposBase = [orden];
      }

      if (!equiposBase.length && equiposIniciales?.length) {
        equiposBase = equiposIniciales;
      }

      const estadoInicial: Record<string, TrabajoEquipo> = {};

      equiposBase.forEach((equipo) => {
        const base = generarTrabajoBase(equipo.id);

        estadoInicial[equipo.id] = {
          ...trabajoVacio(),
          ...base,
        };
      });

      setEquipos(equiposBase);
      setTrabajos(estadoInicial);
    } catch (e: any) {
      alert(e.message || "No se pudo cargar el trabajo");
    } finally {
      setLoading(false);
    }
  }

  function actualizarCampo(
    equipoId: string,
    campo: keyof TrabajoEquipo,
    valor: string | boolean | RepuestoUtilizado[] | FotoEgreso[] | DocumentoTrabajo[]
  ) {
    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || trabajoVacio()),
        [campo]: valor,
      },
    }));
  }

  function agregarRepuesto(equipoId: string) {
    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(equipoId, "repuestos_utilizados", [
      ...actual.repuestos_utilizados,
      {
        id: crearId(),
        cantidad: 1,
        descripcion: "",
        observacion: "",
      },
    ]);
  }

  function actualizarRepuesto(
    equipoId: string,
    repuestoId: string,
    campo: keyof RepuestoUtilizado,
    valor: string | number
  ) {
    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "repuestos_utilizados",
      actual.repuestos_utilizados.map((repuesto) =>
        repuesto.id === repuestoId
          ? {
              ...repuesto,
              [campo]:
                campo === "cantidad"
                  ? Number(valor) || 0
                  : String(valor),
            }
          : repuesto
      )
    );
  }

  function eliminarRepuesto(equipoId: string, repuestoId: string) {
    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "repuestos_utilizados",
      actual.repuestos_utilizados.filter((repuesto) => repuesto.id !== repuestoId)
    );
  }

  async function agregarFotos(equipoId: string, files: FileList | null) {
    if (!files?.length) return;

    const actual = trabajos[equipoId] || trabajoVacio();

    const nuevasFotos: FotoEgreso[] = [];

    for (const file of Array.from(files)) {
      const url = await archivoADataUrl(file);

      nuevasFotos.push({
        id: crearId(),
        nombre: file.name,
        url,
      });
    }

    actualizarCampo(equipoId, "fotos_egreso", [
      ...actual.fotos_egreso,
      ...nuevasFotos,
    ]);
  }

  function eliminarFoto(equipoId: string, fotoId: string) {
    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "fotos_egreso",
      actual.fotos_egreso.filter((foto) => foto.id !== fotoId)
    );
  }

  async function agregarDocumento(equipoId: string, file: File | null) {
    if (!file) return;

    const actual = trabajos[equipoId] || trabajoVacio();
    const url = await archivoADataUrl(file);

    actualizarCampo(equipoId, "documentos", [
      ...actual.documentos,
      {
        id: crearId(),
        tipo: "Certificado",
        nombre: file.name,
        comentario: "",
        url,
      },
    ]);
  }

  function actualizarDocumento(
    equipoId: string,
    documentoId: string,
    campo: keyof DocumentoTrabajo,
    valor: string
  ) {
    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "documentos",
      actual.documentos.map((documento) =>
        documento.id === documentoId
          ? {
              ...documento,
              [campo]: valor,
            }
          : documento
      )
    );
  }

  function eliminarDocumento(equipoId: string, documentoId: string) {
    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "documentos",
      actual.documentos.filter((documento) => documento.id !== documentoId)
    );
  }

  async function guardar(equipoId: string) {
    const actual = trabajos[equipoId] || trabajoVacio();

    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...actual,
        guardando: true,
        guardadoOk: false,
      },
    }));

    try {
      guardarEquipoTrabajo(equipoId, {
        trabajo: {
          trabajo_realizado: actual.trabajo_realizado,
          repuestos_utilizados: actual.repuestos_utilizados as any,
          horas_reales: actual.horas_reales,
          observaciones: actual.observaciones,
          prueba_funcional: actual.prueba_funcional,
          prueba_carga: actual.prueba_carga,
          equipo_liberado: actual.equipo_liberado,
          fotos_egreso: actual.fotos_egreso as any,
          documentos: actual.documentos as any,
        },
      } as any);

      const nuevoEstado = actual.equipo_liberado ? "listo" : "trabajo";

      await supabase
        .from("ordenes")
        .update({ estado: nuevoEstado })
        .eq("id", equipoId);

      if (ordenId) {
        await supabase
          .from("ordenes")
          .update({ estado: nuevoEstado })
          .eq("id", ordenId);

        await supabase
          .from("ordenes")
          .update({ estado: nuevoEstado })
          .eq("orden_padre_id", ordenId);

        onEstadoActualizado?.(nuevoEstado);
      }

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          guardando: false,
          guardadoOk: true,
        },
      }));
    } catch (e: any) {
      alert(e.message || "No se pudo guardar el trabajo");

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          guardando: false,
        },
      }));
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        Cargando trabajo...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {equipos.map((equipo, index) => {
        const actual = trabajos[equipo.id] || trabajoVacio();

        return (
          <div
            key={equipo.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Equipo {index + 1}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {equipo.equipo || "Sin tipo"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {identificadorEquipo(equipo)}
                </p>

                {(equipo.marca || equipo.modelo) && (
                  <p className="mt-1 text-xs text-slate-400">
                    {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                  </p>
                )}

                {actual.equipo_liberado && (
                  <p className="mt-2 text-xs font-bold text-green-700">
                    Equipo listo para entrega
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => guardar(equipo.id)}
                disabled={actual.guardando}
                className={`rounded-xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${
                  actual.guardadoOk ? "bg-green-600" : "bg-blue-600"
                }`}
              >
                {actual.guardando
                  ? "Guardando..."
                  : actual.guardadoOk
                  ? "✓ Trabajo guardado"
                  : "Guardar trabajo"}
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Trabajo realizado
                </label>

                <textarea
                  value={actual.trabajo_realizado}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "trabajo_realizado",
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-700">
                    Repuestos utilizados
                  </label>

                  <button
                    type="button"
                    onClick={() => agregarRepuesto(equipo.id)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                  >
                    + Agregar repuesto
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <th className="p-3">Cantidad</th>
                        <th className="p-3">Repuesto</th>
                        <th className="p-3">Observación</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>

                    <tbody>
                      {actual.repuestos_utilizados.map((repuesto) => (
                        <tr key={repuesto.id} className="border-t border-slate-200">
                          <td className="p-3">
                            <input
                              type="number"
                              value={repuesto.cantidad}
                              onChange={(event) =>
                                actualizarRepuesto(
                                  equipo.id,
                                  repuesto.id,
                                  "cantidad",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-2 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              value={repuesto.descripcion}
                              onChange={(event) =>
                                actualizarRepuesto(
                                  equipo.id,
                                  repuesto.id,
                                  "descripcion",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-2 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <input
                              value={repuesto.observacion}
                              onChange={(event) =>
                                actualizarRepuesto(
                                  equipo.id,
                                  repuesto.id,
                                  "observacion",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-2 py-2"
                            />
                          </td>

                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => eliminarRepuesto(equipo.id, repuesto.id)}
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}

                      {!actual.repuestos_utilizados.length && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            Sin repuestos utilizados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Horas hombre reales
                </label>

                <input
                  type="number"
                  value={actual.horas_reales}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "horas_reales", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Fotografías de egreso
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => agregarFotos(equipo.id, event.target.files)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />

                {!!actual.fotos_egreso.length && (
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {actual.fotos_egreso.map((foto) => (
                      <div
                        key={foto.id}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <a href={foto.url} target="_blank" rel="noreferrer">
                          <img
                            src={foto.url}
                            alt={foto.nombre}
                            className="h-28 w-full object-cover"
                          />
                        </a>

                        <div className="p-2">
                          <p className="truncate text-xs font-semibold text-slate-600">
                            {foto.nombre}
                          </p>

                          <button
                            type="button"
                            onClick={() => eliminarFoto(equipo.id, foto.id)}
                            className="mt-2 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Documentos asociados
                </label>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  onChange={(event) =>
                    agregarDocumento(equipo.id, event.target.files?.[0] || null)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />

                {!!actual.documentos.length && (
                  <div className="mt-3 space-y-3">
                    {actual.documentos.map((documento) => (
                      <div
                        key={documento.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="grid gap-3 md:grid-cols-3">
                          <select
                            value={documento.tipo}
                            onChange={(event) =>
                              actualizarDocumento(
                                equipo.id,
                                documento.id,
                                "tipo",
                                event.target.value
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                          >
                            <option>Certificado</option>
                            <option>Test de carga</option>
                            <option>Manual</option>
                            <option>Ficha técnica</option>
                            <option>Otro</option>
                          </select>

                          <input
                            value={documento.nombre}
                            onChange={(event) =>
                              actualizarDocumento(
                                equipo.id,
                                documento.id,
                                "nombre",
                                event.target.value
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                          />

                          <input
                            value={documento.comentario}
                            onChange={(event) =>
                              actualizarDocumento(
                                equipo.id,
                                documento.id,
                                "comentario",
                                event.target.value
                              )
                            }
                            placeholder="Comentario"
                            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <a
                            href={documento.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold text-blue-700"
                          >
                            Abrir documento
                          </a>

                          <button
                            type="button"
                            onClick={() => eliminarDocumento(equipo.id, documento.id)}
                            className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones finales del técnico
                </label>

                <textarea
                  value={actual.observaciones}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "observaciones", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={actual.prueba_funcional}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "prueba_funcional",
                        event.target.checked
                      )
                    }
                  />
                  Prueba funcional realizada
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={actual.prueba_carga}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "prueba_carga",
                        event.target.checked
                      )
                    }
                  />
                  Prueba de carga realizada
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">
                  <input
                    type="checkbox"
                    checked={actual.equipo_liberado}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "equipo_liberado",
                        event.target.checked
                      )
                    }
                  />
                  Equipo listo para entrega
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}