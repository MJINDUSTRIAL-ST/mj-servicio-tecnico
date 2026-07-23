"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type EstadoEspecial = "" | "bueno" | "malo" | "no_aplica";
type AccionEspecial =
  | ""
  | "repuesto"
  | "reparacion"
  | "ajuste"
  | "mantencion"
  | "otro";

type FotoGuardada = {
  id?: string;
  nombre: string;
  url: string;
  storage_path?: string | null;
  guardada: true;
};

type FotoEspecial = File | FotoGuardada;

type FilaEspecial = {
  id: string;
  componente: string;
  sistema: string;
  afecta_seguridad: boolean;
};

type RespuestaEspecial = {
  estado: EstadoEspecial;
  observacion: string;
  accion: AccionEspecial;
  accion_otro: string;
  repuesto_nombre: string;
  repuesto_cantidad: string;
  fotos: FotoEspecial[];
};

type Props = {
  ordenId: string;
  nombreEquipo?: string | null;
  problemaReportado?: string | null;
  soloLectura?: boolean;
  edicionHistorica?: boolean;
  onProgreso?: (porcentaje: number) => void;
  onGenerarDiagnostico?: (payload: any) => void;
};

const TECNICOS_MJ = [
  "Gustavo Santana",
  "Alvaro Quezada",
  "Jonathan Fonseca",
  "Sergio Gonzalez",
  "Claudia Salazar",
  "Andres Berdejo",
];

const ACCIONES: Array<{ value: AccionEspecial; label: string }> = [
  { value: "", label: "Seleccionar acción..." },
  { value: "repuesto", label: "Repuesto" },
  { value: "reparacion", label: "Reparación" },
  { value: "ajuste", label: "Ajuste" },
  { value: "mantencion", label: "Mantención" },
  { value: "otro", label: "Otro" },
];

function crearIdFila() {
  return `especial-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function crearFila(): FilaEspecial {
  return {
    id: crearIdFila(),
    componente: "",
    sistema: "",
    afecta_seguridad: false,
  };
}

function crearRespuesta(): RespuestaEspecial {
  return {
    estado: "",
    observacion: "",
    accion: "",
    accion_otro: "",
    repuesto_nombre: "",
    repuesto_cantidad: "1",
    fotos: [],
  };
}

function esArchivo(foto: FotoEspecial): foto is File {
  return typeof File !== "undefined" && foto instanceof File;
}

function esGuardada(foto: FotoEspecial): foto is FotoGuardada {
  return !esArchivo(foto) && Boolean((foto as FotoGuardada)?.guardada);
}

function limpiarNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function accionLegible(accion: AccionEspecial, accionOtro: string) {
  if (accion === "repuesto") return "reemplazo";
  if (accion === "reparacion") return "reparación";
  if (accion === "ajuste") return "ajuste";
  if (accion === "mantencion") return "mantención";
  if (accion === "otro") return accionOtro.trim() || "acción técnica";
  return "revisión técnica";
}

function textoEquipo(nombreEquipo?: string | null) {
  if (!nombreEquipo) return "equipo o trabajo especial";

  return nombreEquipo
    .replace(/^Otro\s*\/\s*Trabajo especial\s*:\s*/i, "")
    .trim() || "equipo o trabajo especial";
}

function diagnosticoLocal(
  nombreEquipo: string,
  filas: FilaEspecial[],
  respuestas: Record<string, RespuestaEspecial>,
) {
  const filasMalas = filas.filter(
    (fila) => respuestas[fila.id]?.estado === "malo",
  );

  if (filasMalas.length === 0) {
    const texto =
      `El ${nombreEquipo.toLowerCase()} no presenta hallazgos marcados como malos en el checklist personalizado. ` +
      "Se recomienda realizar una revisión funcional final antes de liberar el equipo o cerrar el trabajo.";

    return {
      tipoEquipo: "otro",
      nombreEquipo,
      resumen: texto,
      diagnosticoTecnico: texto,
      procedimientoRecomendado: [
        "Realizar revisión funcional final y documentar el resultado.",
      ],
      repuestosSugeridos: [],
      criticidad: "baja",
      requiereRetiroServicio: false,
      itemsMalos: [],
    };
  }

  const hallazgos = filasMalas.map((fila, index) => {
    const respuesta = respuestas[fila.id];
    const riesgo = fila.afecta_seguridad
      ? " El hallazgo afecta la seguridad y debe corregirse antes de liberar el equipo."
      : "";

    return `${index + 1}. ${fila.componente}: ${
      respuesta.observacion || "condición deficiente detectada"
    }. Acción indicada: ${accionLegible(
      respuesta.accion,
      respuesta.accion_otro,
    )}.${riesgo}`;
  });

  const procedimiento = filasMalas.map((fila, index) => {
    const respuesta = respuestas[fila.id];

    return `${index + 1}. Realizar ${accionLegible(
      respuesta.accion,
      respuesta.accion_otro,
    )} en ${fila.componente} y verificar posteriormente su condición.`;
  });

  procedimiento.push(
    "Realizar prueba funcional y validación de seguridad antes de liberar el equipo o cerrar el trabajo.",
  );

  const repuestos = filasMalas
    .filter((fila) => respuestas[fila.id]?.accion === "repuesto")
    .map((fila) => {
      const respuesta = respuestas[fila.id];

      return `${respuesta.repuesto_cantidad || "1"} x ${
        respuesta.repuesto_nombre || fila.componente
      } | Motivo: ${respuesta.observacion || "Componente marcado como malo"}`;
    });

  const critica = filasMalas.some((fila) => fila.afecta_seguridad);
  const resumen =
    `El ${nombreEquipo.toLowerCase()} presenta ${
      filasMalas.length
    } hallazgo${filasMalas.length === 1 ? "" : "s"} técnico${
      filasMalas.length === 1 ? "" : "s"
    } en el checklist personalizado. ` +
    (critica
      ? "Existen condiciones que afectan la seguridad, por lo que no debe liberarse hasta completar las correcciones y pruebas."
      : "Los hallazgos deben corregirse y validarse antes de cerrar el trabajo.");

  return {
    tipoEquipo: "otro",
    nombreEquipo,
    resumen,
    diagnosticoTecnico: [resumen, ...hallazgos].join("\n"),
    procedimientoRecomendado: procedimiento,
    repuestosSugeridos: repuestos,
    criticidad: critica ? "alta" : "media",
    requiereRetiroServicio: critica,
    itemsMalos: filasMalas.map((fila) => ({
      item: {
        id: fila.id,
        label: fila.componente,
        sistema: fila.sistema,
        afectaSeguridad: fila.afecta_seguridad,
      },
      respuesta: respuestas[fila.id],
    })),
  };
}

export default function ChecklistEspecial({
  ordenId,
  nombreEquipo,
  problemaReportado,
  soloLectura = false,
  edicionHistorica = false,
  onProgreso,
  onGenerarDiagnostico,
}: Props) {
  const [filas, setFilas] = useState<FilaEspecial[]>([crearFila()]);
  const [respuestas, setRespuestas] = useState<
    Record<string, RespuestaEspecial>
  >({});
  const [tecnicoACargo, setTecnicoACargo] = useState("");
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [pathsIniciales, setPathsIniciales] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const nombreVisible = textoEquipo(nombreEquipo);

  useEffect(() => {
    cargarChecklist();
  }, [ordenId]);

  useEffect(() => {
    const respondidas = filas.filter(
      (fila) => Boolean(respuestas[fila.id]?.estado),
    ).length;

    const porcentaje =
      filas.length > 0 ? Math.round((respondidas / filas.length) * 100) : 0;

    onProgreso?.(porcentaje);
  }, [filas, respuestas, onProgreso]);

  async function cargarChecklist() {
    setCargando(true);
    setError("");

    const [
      { data: checklistData, error: checklistError },
      { data: fotosData, error: fotosError },
      { data: ordenData },
    ] = await Promise.all([
      supabase
        .from("checklists_tecnicos")
        .select(
          "tipo_equipo,checklist_json,respuestas_json,observaciones_generales",
        )
        .eq("orden_id", ordenId)
        .maybeSingle(),

      supabase
        .from("checklist_fotos")
        .select("id,item_id,url,storage_path,nombre")
        .eq("orden_id", ordenId),

      supabase
        .from("ordenes")
        .select("tecnico_responsable")
        .eq("id", ordenId)
        .maybeSingle(),
    ]);

    if (checklistError || fotosError) {
      setError(
        checklistError?.message ||
          fotosError?.message ||
          "No se pudo cargar el checklist personalizado.",
      );
      setCargando(false);
      return;
    }

    const checklistJson = checklistData?.checklist_json as any;
    const respuestasJson = (checklistData?.respuestas_json || {}) as Record<
      string,
      any
    >;

    const itemsGuardados = Array.isArray(checklistJson?.sections?.[0]?.items)
      ? checklistJson.sections[0].items
      : [];

    const filasCargadas: FilaEspecial[] =
      itemsGuardados.length > 0
        ? itemsGuardados.map((item: any) => ({
            id: String(item.id || crearIdFila()),
            componente: String(item.label || item.componente || ""),
            sistema: String(item.sistema || ""),
            afecta_seguridad: Boolean(item.afectaSeguridad),
          }))
        : [crearFila()];

    const fotosPorItem = (fotosData || []).reduce<
      Record<string, FotoGuardada[]>
    >((acc, foto: any) => {
      const itemId = String(foto.item_id || "");

      if (!itemId || !foto.url) return acc;
      if (!acc[itemId]) acc[itemId] = [];

      acc[itemId].push({
        id: foto.id ? String(foto.id) : undefined,
        nombre: String(foto.nombre || "Foto checklist"),
        url: String(foto.url),
        storage_path: foto.storage_path || null,
        guardada: true,
      });

      return acc;
    }, {});

    const respuestasCargadas: Record<string, RespuestaEspecial> = {};

    filasCargadas.forEach((fila) => {
      const guardada = respuestasJson[fila.id] || {};
      const acciones = Array.isArray(guardada.acciones)
        ? guardada.acciones
        : [];

      respuestasCargadas[fila.id] = {
        estado:
          guardada.estado === "bueno" ||
          guardada.estado === "malo" ||
          guardada.estado === "no_aplica"
            ? guardada.estado
            : "",
        observacion: String(guardada.observacion || ""),
        accion:
          acciones[0] === "repuesto" ||
          acciones[0] === "reparacion" ||
          acciones[0] === "ajuste" ||
          acciones[0] === "mantencion" ||
          acciones[0] === "otro"
            ? acciones[0]
            : "",
        accion_otro: String(guardada.accion_otro || ""),
        repuesto_nombre: String(guardada.repuesto_nombre || ""),
        repuesto_cantidad: String(guardada.repuesto_cantidad || "1"),
        fotos: fotosPorItem[fila.id] || [],
      };
    });

    setFilas(filasCargadas);
    setRespuestas(respuestasCargadas);
    setObservacionesGenerales(
      String(checklistData?.observaciones_generales || ""),
    );
    setTecnicoACargo(String(ordenData?.tecnico_responsable || ""));
    setPathsIniciales(
      (fotosData || [])
        .map((foto: any) => String(foto.storage_path || ""))
        .filter(Boolean),
    );
    setCargando(false);
  }

  function respuestaFila(id: string) {
    return respuestas[id] || crearRespuesta();
  }

  function actualizarFila(
    id: string,
    campo: keyof Omit<FilaEspecial, "id">,
    valor: string | boolean,
  ) {
    if (soloLectura) return;

    setFilas((prev) =>
      prev.map((fila) =>
        fila.id === id ? { ...fila, [campo]: valor } : fila,
      ),
    );
  }

  function actualizarRespuesta(
    id: string,
    cambios: Partial<RespuestaEspecial>,
  ) {
    if (soloLectura) return;

    setRespuestas((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || crearRespuesta()),
        ...cambios,
      },
    }));
  }

  function cambiarEstado(id: string, estado: EstadoEspecial) {
    if (soloLectura) return;

    if (estado === "malo") {
      actualizarRespuesta(id, { estado });
      return;
    }

    actualizarRespuesta(id, {
      estado,
      observacion: "",
      accion: "",
      accion_otro: "",
      repuesto_nombre: "",
      repuesto_cantidad: "1",
    });
  }

  function agregarFila() {
    if (soloLectura) return;

    const nueva = crearFila();

    setFilas((prev) => [...prev, nueva]);
    setRespuestas((prev) => ({
      ...prev,
      [nueva.id]: crearRespuesta(),
    }));
  }

  function eliminarFila(id: string) {
    if (soloLectura) return;

    if (filas.length === 1) {
      alert("El checklist debe mantener al menos una línea.");
      return;
    }

    setFilas((prev) => prev.filter((fila) => fila.id !== id));
    setRespuestas((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  }

  function agregarFotos(id: string, files: FileList | null) {
    if (!files || soloLectura) return;

    const nuevas = Array.from(files);

    actualizarRespuesta(id, {
      fotos: [...respuestaFila(id).fotos, ...nuevas],
    });
  }

  function eliminarFoto(id: string, index: number) {
    if (soloLectura) return;

    actualizarRespuesta(id, {
      fotos: respuestaFila(id).fotos.filter(
        (_, fotoIndex) => fotoIndex !== index,
      ),
    });
  }

  function validar() {
    if (!tecnicoACargo.trim()) {
      alert("Selecciona el técnico a cargo.");
      return false;
    }

    const indiceIncompleto = filas.findIndex((fila) => {
      const respuesta = respuestaFila(fila.id);

      return !fila.componente.trim() || !respuesta.estado;
    });

    if (indiceIncompleto >= 0) {
      alert(
        `Completa componente y estado en la línea ${indiceIncompleto + 1}.`,
      );
      return false;
    }

    const indiceMaloIncompleto = filas.findIndex((fila) => {
      const respuesta = respuestaFila(fila.id);

      if (respuesta.estado !== "malo") return false;

      return !respuesta.observacion.trim() || !respuesta.accion;
    });

    if (indiceMaloIncompleto >= 0) {
      alert(
        `Completa observación y acción requerida en la línea ${
          indiceMaloIncompleto + 1
        }.`,
      );
      return false;
    }

    const indiceRepuestoIncompleto = filas.findIndex((fila) => {
      const respuesta = respuestaFila(fila.id);

      return (
        respuesta.estado === "malo" &&
        respuesta.accion === "repuesto" &&
        !respuesta.repuesto_nombre.trim()
      );
    });

    if (indiceRepuestoIncompleto >= 0) {
      alert(
        `Ingresa el repuesto requerido en la línea ${
          indiceRepuestoIncompleto + 1
        }.`,
      );
      return false;
    }

    return true;
  }

  function construirChecklist() {
    return {
      tipo: "otro",
      nombre: `Checklist personalizado - ${nombreVisible}`,
      descripcion:
        "Checklist creado manualmente para un equipo no habitual o trabajo especial.",
      sections: [
        {
          id: "componentes_personalizados",
          nombre: "Componentes y puntos revisados",
          items: filas.map((fila) => ({
            id: fila.id,
            label: fila.componente.trim(),
            sistema: fila.sistema.trim(),
            afectaSeguridad: fila.afecta_seguridad,
          })),
        },
      ],
    };
  }

  function respuestasParaGuardar() {
    const salida: Record<string, any> = {};

    filas.forEach((fila) => {
      const respuesta = respuestaFila(fila.id);

      salida[fila.id] = {
        estado: respuesta.estado,
        observacion: respuesta.observacion.trim(),
        acciones: respuesta.accion ? [respuesta.accion] : [],
        repuesto_nombre: respuesta.repuesto_nombre.trim(),
        repuesto_cantidad: respuesta.repuesto_cantidad || "1",
        accion_otro: respuesta.accion_otro.trim(),
        cantidad_fotos: respuesta.fotos.length,
      };
    });

    return salida;
  }

  async function guardarChecklistBase() {
    const checklist = construirChecklist();
    const respuestasDb = respuestasParaGuardar();

    const { error: errorChecklist } = await supabase
      .from("checklists_tecnicos")
      .upsert(
        {
          orden_id: ordenId,
          tipo_equipo: "otro",
          checklist_nombre: checklist.nombre,
          checklist_descripcion: checklist.descripcion,
          checklist_json: checklist,
          respuestas_json: respuestasDb,
          items_malos_json: filas
            .filter((fila) => respuestaFila(fila.id).estado === "malo")
            .map((fila) => ({
              item: {
                id: fila.id,
                label: fila.componente,
                sistema: fila.sistema,
                afectaSeguridad: fila.afecta_seguridad,
              },
              respuesta: respuestasDb[fila.id],
            })),
          observaciones_generales: observacionesGenerales.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "orden_id" },
      );

    if (errorChecklist) throw new Error(errorChecklist.message);

    const { error: errorTecnico } = await supabase
      .from("ordenes")
      .update({ tecnico_responsable: tecnicoACargo.trim() })
      .eq("id", ordenId);

    if (errorTecnico) throw new Error(errorTecnico.message);

    const pathsActuales = filas.flatMap((fila) =>
      respuestaFila(fila.id).fotos
        .filter(esGuardada)
        .map((foto) => foto.storage_path || "")
        .filter(Boolean),
    );

    const pathsEliminar = pathsIniciales.filter(
      (path) => !pathsActuales.includes(path),
    );

    if (pathsEliminar.length > 0) {
      await supabase.storage.from("reportes").remove(pathsEliminar);

      await supabase
        .from("checklist_fotos")
        .delete()
        .eq("orden_id", ordenId)
        .in("storage_path", pathsEliminar);
    }

    const fotosInsertar: any[] = [];

    for (const fila of filas) {
      const respuesta = respuestaFila(fila.id);
      const nuevas = respuesta.fotos.filter(esArchivo);

      for (let index = 0; index < nuevas.length; index += 1) {
        const foto = nuevas[index];
        const nombreSeguro = limpiarNombreArchivo(
          foto.name || `foto-${index}.jpg`,
        );
        const storagePath = `checklist/${ordenId}/${fila.id}-${Date.now()}-${index}-${nombreSeguro}`;

        const { error: uploadError } = await supabase.storage
          .from("reportes")
          .upload(storagePath, foto, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("reportes")
          .getPublicUrl(storagePath);

        fotosInsertar.push({
          orden_id: ordenId,
          item_id: fila.id,
          item_label: fila.componente.trim(),
          url: publicUrlData.publicUrl,
          storage_path: storagePath,
          nombre: foto.name || nombreSeguro,
          observacion: respuesta.observacion.trim() || null,
        });
      }
    }

    if (fotosInsertar.length > 0) {
      const { error: fotosInsertError } = await supabase
        .from("checklist_fotos")
        .insert(fotosInsertar);

      if (fotosInsertError) throw new Error(fotosInsertError.message);
    }

    return {
      checklist,
      respuestasDb,
    };
  }

  async function guardarBorrador() {
    if (!validar()) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      await guardarChecklistBase();
      await cargarChecklist();
      setMensaje("Checklist personalizado guardado.");
    } catch (errorGuardado: any) {
      setError(
        errorGuardado?.message ||
          "No se pudo guardar el checklist personalizado.",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function guardarYGenerarDiagnostico() {
    if (!validar()) return;

    setGenerando(true);
    setMensaje("");
    setError("");

    try {
      const { checklist } = await guardarChecklistBase();

      const itemsMalos = filas
        .filter((fila) => respuestaFila(fila.id).estado === "malo")
        .map((fila) => {
          const respuesta = respuestaFila(fila.id);

          return {
            item: {
              id: fila.id,
              label: fila.componente.trim(),
              sistema: fila.sistema.trim(),
              afectaSeguridad: fila.afecta_seguridad,
            },
            respuesta: {
              estado: respuesta.estado,
              observacion: respuesta.observacion.trim(),
              acciones: respuesta.accion ? [respuesta.accion] : [],
              repuesto_nombre: respuesta.repuesto_nombre.trim(),
              repuesto_cantidad: respuesta.repuesto_cantidad || "1",
              accion_otro: respuesta.accion_otro.trim(),
              fotos: respuesta.fotos,
            },
          };
        });

      const respuestasPayload: Record<string, any> = {};

      filas.forEach((fila) => {
        const respuesta = respuestaFila(fila.id);

        respuestasPayload[fila.id] = {
          estado: respuesta.estado,
          observacion: respuesta.observacion.trim(),
          acciones: respuesta.accion ? [respuesta.accion] : [],
          repuesto_nombre: respuesta.repuesto_nombre.trim(),
          repuesto_cantidad: respuesta.repuesto_cantidad || "1",
          accion_otro: respuesta.accion_otro.trim(),
          fotos: respuesta.fotos,
        };
      });

      let diagnostico = diagnosticoLocal(
        nombreVisible,
        filas,
        respuestas,
      );
      let diagnosticoSenior: any = null;
      let fuenteIA = "respaldo-local";

      try {
        const response = await fetch("/api/diagnostico-ia", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ordenId,
            equipoId: ordenId,
            equipo: {
              tipoEquipo: "otro",
              tipo: "otro",
              nombreChecklist: checklist.nombre,
              descripcionChecklist: checklist.descripcion,
              nombreEquipo: nombreVisible,
            },
            checklist: {
              totalItems: filas.length,
              itemsRespondidos: filas.filter((fila) =>
                Boolean(respuestaFila(fila.id).estado),
              ).length,
              items: filas.map((fila) => {
                const respuesta = respuestaFila(fila.id);

                return {
                  item: {
                    id: fila.id,
                    label: fila.componente.trim(),
                    sistema: fila.sistema.trim(),
                    afectaSeguridad: fila.afecta_seguridad,
                  },
                  respuesta: {
                    estado: respuesta.estado,
                    observacion: respuesta.observacion.trim(),
                    acciones: respuesta.accion ? [respuesta.accion] : [],
                    repuesto_nombre: respuesta.repuesto_nombre.trim(),
                    repuesto_cantidad:
                      respuesta.repuesto_cantidad || "1",
                    accion_otro: respuesta.accion_otro.trim(),
                    cantidad_fotos: respuesta.fotos.length,
                  },
                };
              }),
              itemsMalos: itemsMalos.map((registro) => ({
                item: registro.item,
                respuesta: {
                  ...registro.respuesta,
                  cantidad_fotos: registro.respuesta.fotos.length,
                  fotos: undefined,
                },
              })),
            },
            problemaReportado: problemaReportado || "",
            tecnicoACargo,
            tecnico_a_cargo: tecnicoACargo,
            observacionesIngreso: observacionesGenerales,
            observaciones: observacionesGenerales,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const senior = data?.diagnostico || null;
          const resultado = data?.resultado || {};

          const hallazgos =
            senior?.textoTecnicoNatural ||
            senior?.resumenEjecutivo?.conclusion ||
            resultado?.hallazgos ||
            diagnostico.diagnosticoTecnico;

          const procedimientosSenior = Array.isArray(
            senior?.procedimientoRecomendado,
          )
            ? senior.procedimientoRecomendado
                .map((item: any) => item?.trabajo || item?.observacion || "")
                .filter(Boolean)
            : [];

          const procedimientosResultado = Array.isArray(
            resultado?.trabajosRequeridos,
          )
            ? resultado.trabajosRequeridos
            : [];

          const repuestosSenior = Array.isArray(senior?.repuestosSugeridos)
            ? senior.repuestosSugeridos.map((item: any) => {
                return `${item?.cantidad || 1} x ${
                  item?.nombre || "Repuesto"
                } | Motivo: ${item?.motivo || "Según diagnóstico"}`;
              })
            : [];

          diagnostico = {
            ...diagnostico,
            resumen:
              senior?.resumenEjecutivo?.estadoGeneral ||
              resultado?.resumenCliente ||
              diagnostico.resumen,
            diagnosticoTecnico: hallazgos,
            procedimientoRecomendado:
              procedimientosSenior.length > 0
                ? procedimientosSenior
                : procedimientosResultado.length > 0
                ? procedimientosResultado
                : diagnostico.procedimientoRecomendado,
            repuestosSugeridos:
              repuestosSenior.length > 0
                ? repuestosSenior
                : diagnostico.repuestosSugeridos,
            criticidad:
              String(
                senior?.riesgo?.clasificacion ||
                  resultado?.criticidad ||
                  diagnostico.criticidad,
              ).toLowerCase(),
            requiereRetiroServicio:
              String(
                senior?.riesgo?.clasificacion ||
                  resultado?.criticidad ||
                  "",
              )
                .toLowerCase()
                .includes("alt") ||
              String(resultado?.estadoFinal || "") === "no_apto" ||
              diagnostico.requiereRetiroServicio,
          };

          diagnosticoSenior = senior;
          fuenteIA = data?.fuente || "openai";
        }
      } catch (errorIA) {
        console.error(
          "No se pudo usar la IA para el checklist especial:",
          errorIA,
        );
      }

      onGenerarDiagnostico?.({
        equipoId: ordenId,
        tipoEquipo: "otro",
        checklist,
        respuestas: respuestasPayload,
        itemsMalos,
        diagnostico,
        observacionesGenerales,
        diagnosticoIASenior: diagnosticoSenior,
        fuenteIA,
        tecnicoACargo,
        checklistPersistido: true,
        preservarEstadoActual: edicionHistorica,
      });
    } catch (errorGeneracion: any) {
      setError(
        errorGeneracion?.message ||
          "No se pudo guardar ni generar el diagnóstico.",
      );
    } finally {
      setGenerando(false);
    }
  }

  const respondidas = useMemo(
    () =>
      filas.filter((fila) => Boolean(respuestaFila(fila.id).estado))
        .length,
    [filas, respuestas],
  );

  const malas = useMemo(
    () =>
      filas.filter((fila) => respuestaFila(fila.id).estado === "malo")
        .length,
    [filas, respuestas],
  );

  if (cargando) {
    return (
      <section className="contenedor">
        <p className="muted">Cargando checklist personalizado...</p>
      </section>
    );
  }

  return (
    <section className="contenedor">
      <div className="encabezado">
        <div>
          <span className="eyebrow">Equipo no habitual</span>
          <h2>Checklist personalizado</h2>
          <p>
            Agrega manualmente los componentes o puntos que deben revisarse.
          </p>
        </div>

        <div className="resumen">
          <div>
            <span>Total</span>
            <strong>{filas.length}</strong>
          </div>
          <div>
            <span>Respondidos</span>
            <strong>{respondidas}</strong>
          </div>
          <div>
            <span>Malos</span>
            <strong className="rojo">{malas}</strong>
          </div>
        </div>
      </div>

      {soloLectura ? (
        <div className="avisoLectura">
          Esta etapa está guardada. Presiona Modificar etapa para realizar
          cambios.
        </div>
      ) : null}

      <div className="datosGenerales">
        <div>
          <label>Técnico a cargo *</label>
          <select
            value={tecnicoACargo}
            onChange={(event) => setTecnicoACargo(event.target.value)}
            disabled={soloLectura}
          >
            <option value="">Seleccionar técnico...</option>
            {TECNICOS_MJ.map((tecnico) => (
              <option key={tecnico} value={tecnico}>
                {tecnico}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Equipo o trabajo especial</label>
          <input value={nombreVisible} readOnly />
        </div>
      </div>

      <div className="lista">
        {filas.map((fila, index) => {
          const respuesta = respuestaFila(fila.id);

          return (
            <article key={fila.id} className="fila">
              <div className="filaHeader">
                <strong>Línea {index + 1}</strong>

                {!soloLectura ? (
                  <button
                    type="button"
                    className="eliminar"
                    onClick={() => eliminarFila(fila.id)}
                  >
                    Eliminar línea
                  </button>
                ) : null}
              </div>

              <div className="gridDos">
                <div>
                  <label>Componente o punto revisado *</label>
                  <input
                    value={fila.componente}
                    onChange={(event) =>
                      actualizarFila(
                        fila.id,
                        "componente",
                        event.target.value,
                      )
                    }
                    placeholder="Ej: Estructura principal"
                    disabled={soloLectura}
                  />
                </div>

                <div>
                  <label>Sistema / área</label>
                  <input
                    value={fila.sistema}
                    onChange={(event) =>
                      actualizarFila(fila.id, "sistema", event.target.value)
                    }
                    placeholder="Ej: Estructura, eléctrico, mecánico"
                    disabled={soloLectura}
                  />
                </div>
              </div>

              <div className="estadoBloque">
                <label>Estado *</label>

                <div className="estados">
                  <button
                    type="button"
                    className={
                      respuesta.estado === "bueno" ? "seleccionadoBueno" : ""
                    }
                    onClick={() => cambiarEstado(fila.id, "bueno")}
                    disabled={soloLectura}
                  >
                    Bueno
                  </button>

                  <button
                    type="button"
                    className={
                      respuesta.estado === "malo" ? "seleccionadoMalo" : ""
                    }
                    onClick={() => cambiarEstado(fila.id, "malo")}
                    disabled={soloLectura}
                  >
                    Malo
                  </button>

                  <button
                    type="button"
                    className={
                      respuesta.estado === "no_aplica"
                        ? "seleccionadoNoAplica"
                        : ""
                    }
                    onClick={() => cambiarEstado(fila.id, "no_aplica")}
                    disabled={soloLectura}
                  >
                    No aplica
                  </button>
                </div>
              </div>

              {respuesta.estado === "malo" ? (
                <div className="detalleMalo">
                  <div>
                    <label>Observación *</label>
                    <textarea
                      value={respuesta.observacion}
                      onChange={(event) =>
                        actualizarRespuesta(fila.id, {
                          observacion: event.target.value,
                        })
                      }
                      placeholder="Describe la falla encontrada"
                      disabled={soloLectura}
                    />
                  </div>

                  <div className="gridDos">
                    <div>
                      <label>Acción requerida *</label>
                      <select
                        value={respuesta.accion}
                        onChange={(event) =>
                          actualizarRespuesta(fila.id, {
                            accion: event.target.value as AccionEspecial,
                          })
                        }
                        disabled={soloLectura}
                      >
                        {ACCIONES.map((accion) => (
                          <option key={accion.value} value={accion.value}>
                            {accion.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="seguridad">
                      <input
                        type="checkbox"
                        checked={fila.afecta_seguridad}
                        onChange={(event) =>
                          actualizarFila(
                            fila.id,
                            "afecta_seguridad",
                            event.target.checked,
                          )
                        }
                        disabled={soloLectura}
                      />
                      <span>Afecta seguridad</span>
                    </label>
                  </div>

                  {respuesta.accion === "otro" ? (
                    <div>
                      <label>Especificar acción</label>
                      <input
                        value={respuesta.accion_otro}
                        onChange={(event) =>
                          actualizarRespuesta(fila.id, {
                            accion_otro: event.target.value,
                          })
                        }
                        placeholder="Describe la acción requerida"
                        disabled={soloLectura}
                      />
                    </div>
                  ) : null}

                  {respuesta.accion === "repuesto" ? (
                    <div className="gridRepuesto">
                      <div>
                        <label>Repuesto requerido *</label>
                        <input
                          value={respuesta.repuesto_nombre}
                          onChange={(event) =>
                            actualizarRespuesta(fila.id, {
                              repuesto_nombre: event.target.value,
                            })
                          }
                          placeholder="Nombre del repuesto"
                          disabled={soloLectura}
                        />
                      </div>

                      <div>
                        <label>Cantidad</label>
                        <input
                          type="number"
                          min={1}
                          value={respuesta.repuesto_cantidad}
                          onChange={(event) =>
                            actualizarRespuesta(fila.id, {
                              repuesto_cantidad: event.target.value,
                            })
                          }
                          disabled={soloLectura}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label>Fotos</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        agregarFotos(fila.id, event.target.files);
                        event.currentTarget.value = "";
                      }}
                      disabled={soloLectura}
                    />

                    {respuesta.fotos.length > 0 ? (
                      <div className="fotos">
                        {respuesta.fotos.map((foto, fotoIndex) => (
                          <div
                            key={`${fila.id}-${fotoIndex}`}
                            className="fotoItem"
                          >
                            {esGuardada(foto) ? (
                              <a
                                href={foto.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {foto.nombre}
                              </a>
                            ) : (
                              <span>{foto.name}</span>
                            )}

                            {!soloLectura ? (
                              <button
                                type="button"
                                onClick={() =>
                                  eliminarFoto(fila.id, fotoIndex)
                                }
                              >
                                Quitar
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {!soloLectura ? (
        <button type="button" className="agregar" onClick={agregarFila}>
          + Agregar componente o punto revisado
        </button>
      ) : null}

      <div className="observaciones">
        <label>Observaciones generales</label>
        <textarea
          value={observacionesGenerales}
          onChange={(event) =>
            setObservacionesGenerales(event.target.value)
          }
          placeholder="Información adicional del trabajo especial"
          disabled={soloLectura}
        />
      </div>

      {error ? <div className="error">{error}</div> : null}
      {mensaje ? <div className="exito">{mensaje}</div> : null}

      {!soloLectura ? (
        <div className="acciones">
          <button
            type="button"
            className="secundario"
            onClick={guardarBorrador}
            disabled={guardando || generando}
          >
            {guardando ? "Guardando..." : "Guardar checklist"}
          </button>

          <button
            type="button"
            className="principal"
            onClick={guardarYGenerarDiagnostico}
            disabled={guardando || generando}
          >
            {generando
              ? "Generando diagnóstico..."
              : edicionHistorica
              ? "Guardar modificación"
              : "Guardar y generar diagnóstico"}
          </button>
        </div>
      ) : null}

      <style jsx>{`
        .contenedor {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: white;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .encabezado {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 18px;
        }

        .eyebrow {
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
        }

        h2 {
          margin: 4px 0 5px;
          color: #0f172a;
          font-size: 21px;
        }

        .encabezado p,
        .muted {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .resumen {
          display: grid;
          grid-template-columns: repeat(3, minmax(70px, 1fr));
          gap: 8px;
        }

        .resumen div {
          min-width: 78px;
          border-radius: 12px;
          background: #f8fafc;
          padding: 9px;
          text-align: center;
        }

        .resumen span {
          display: block;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
        }

        .resumen strong {
          display: block;
          margin-top: 3px;
          color: #0f172a;
          font-size: 16px;
        }

        .resumen .rojo {
          color: #dc2626;
        }

        .avisoLectura {
          margin-bottom: 16px;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          background: #f0fdf4;
          color: #166534;
          padding: 11px 13px;
          font-size: 12px;
          font-weight: 800;
        }

        .datosGenerales,
        .gridDos {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .datosGenerales {
          margin-bottom: 16px;
          border-radius: 14px;
          background: #f8fafc;
          padding: 14px;
        }

        label {
          display: block;
          margin-bottom: 6px;
          color: #334155;
          font-size: 12px;
          font-weight: 900;
        }

        input,
        select,
        textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          color: #0f172a;
          padding: 10px 11px;
          font-size: 13px;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2563eb;
        }

        input:disabled,
        select:disabled,
        textarea:disabled {
          background: #f8fafc;
          color: #475569;
          cursor: not-allowed;
        }

        textarea {
          min-height: 84px;
          resize: vertical;
        }

        .lista {
          display: grid;
          gap: 14px;
        }

        .fila {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #fff;
          padding: 15px;
        }

        .filaHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .filaHeader strong {
          color: #0f172a;
          font-size: 14px;
        }

        button {
          border: 0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 900;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .eliminar {
          background: #fee2e2;
          color: #b91c1c;
          padding: 8px 10px;
        }

        .estadoBloque {
          margin-top: 12px;
        }

        .estados {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .estados button {
          border: 1px solid #dbe3ee;
          background: white;
          color: #334155;
          padding: 10px;
        }

        .estados .seleccionadoBueno {
          border-color: #22c55e;
          background: #f0fdf4;
          color: #15803d;
        }

        .estados .seleccionadoMalo {
          border-color: #ef4444;
          background: #fef2f2;
          color: #b91c1c;
        }

        .estados .seleccionadoNoAplica {
          border-color: #94a3b8;
          background: #f8fafc;
          color: #475569;
        }

        .detalleMalo {
          display: grid;
          gap: 12px;
          margin-top: 12px;
          border: 1px solid #fecaca;
          border-radius: 14px;
          background: #fff7f7;
          padding: 13px;
        }

        .seguridad {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          margin: 21px 0 0;
          border: 1px solid #fed7aa;
          border-radius: 10px;
          background: #fff7ed;
          padding: 0 11px;
        }

        .seguridad input {
          width: 16px;
          height: 16px;
        }

        .seguridad span {
          color: #9a3412;
          font-size: 12px;
          font-weight: 900;
        }

        .gridRepuesto {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 120px;
          gap: 12px;
        }

        .fotos {
          display: grid;
          gap: 7px;
          margin-top: 8px;
        }

        .fotoItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-radius: 9px;
          background: white;
          padding: 8px 10px;
          font-size: 12px;
        }

        .fotoItem a {
          color: #2563eb;
          text-decoration: none;
        }

        .fotoItem button {
          background: transparent;
          color: #dc2626;
        }

        .agregar {
          width: 100%;
          margin-top: 14px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 11px 13px;
        }

        .observaciones {
          margin-top: 16px;
        }

        .error,
        .exito {
          margin-top: 12px;
          border-radius: 11px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .error {
          background: #fee2e2;
          color: #b91c1c;
        }

        .exito {
          background: #dcfce7;
          color: #166534;
        }

        .acciones {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }

        .secundario,
        .principal {
          padding: 11px 15px;
        }

        .secundario {
          border: 1px solid #cbd5e1;
          background: white;
          color: #334155;
        }

        .principal {
          background: #2563eb;
          color: white;
        }

        @media (max-width: 760px) {
          .encabezado {
            flex-direction: column;
          }

          .resumen {
            width: 100%;
          }

          .datosGenerales,
          .gridDos,
          .gridRepuesto {
            grid-template-columns: 1fr;
          }

          .seguridad {
            margin-top: 0;
          }

          .acciones {
            flex-direction: column-reverse;
          }

          .acciones button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}