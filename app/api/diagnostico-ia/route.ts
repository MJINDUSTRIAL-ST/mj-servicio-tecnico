import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type EstadoChecklist = "bueno" | "regular" | "malo";

type ChecklistItemNormalizado = {
  id: string;
  nombre: string;
  estado: EstadoChecklist;
  categoria: string;
  observacion: string;
  acciones: string[];
  repuestoNombre: string;
  repuestoCantidad: string;
  afectaSeguridad: boolean;
};

type PayloadDiagnosticoIA = {
  ordenId?: string | null;
  equipoId?: string | null;
  equipo?: {
    tipo?: string | null;
    tipoEquipo?: string | null;
    marca?: string | null;
    modelo?: string | null;
    serie?: string | null;
    numero_serie?: string | null;
    capacidad?: string | null;
    anio?: string | number | null;
    año?: string | number | null;
    nombreChecklist?: string | null;
    descripcionChecklist?: string | null;
  } | null;
  checklist?: any;
  respuestas?: Record<string, any> | null;
  itemsMalos?: any[] | null;
  problemaReportado?: string | null;
  observacionesIngreso?: string | null;
  observaciones?: string | null;
};

const MODELO_DIAGNOSTICO = process.env.OPENAI_MODEL_DIAGNOSTICO || "gpt-4o-mini";

function crearOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function crearSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function normalizarTexto(valor: unknown): string {
  return textoSeguro(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarEstado(valor: unknown): EstadoChecklist | null {
  const texto = normalizarTexto(valor);

  if (["bueno", "bien", "ok", "correcto", "aprobado"].includes(texto)) {
    return "bueno";
  }

  if (["regular", "observado", "observacion", "con observacion"].includes(texto)) {
    return "regular";
  }

  if (["malo", "mal", "deficiente", "rechazado", "critico", "critica"].includes(texto)) {
    return "malo";
  }

  return null;
}

function normalizarCategoria(valor: unknown): string {
  const texto = normalizarTexto(valor);

  if (
    texto.includes("electr") ||
    texto.includes("motor") ||
    texto.includes("control") ||
    texto.includes("botonera") ||
    texto.includes("alimentacion") ||
    texto.includes("enchufe") ||
    texto.includes("cableado")
  ) {
    return "Sistema eléctrico";
  }

  if (
    texto.includes("seguridad") ||
    texto.includes("freno") ||
    texto.includes("limitador") ||
    texto.includes("gancho") ||
    texto.includes("pestillo")
  ) {
    return "Sistema de seguridad";
  }

  if (
    texto.includes("estructura") ||
    texto.includes("carcasa") ||
    texto.includes("chasis") ||
    texto.includes("bastidor") ||
    texto.includes("deformacion") ||
    texto.includes("fisura")
  ) {
    return "Sistema estructural";
  }

  if (
    texto.includes("cadena") ||
    texto.includes("cable de acero") ||
    texto.includes("tambor") ||
    texto.includes("elevacion") ||
    texto.includes("eslinga")
  ) {
    return "Sistema de elevación / tracción";
  }

  if (
    texto.includes("carro") ||
    texto.includes("rueda") ||
    texto.includes("traslacion")
  ) {
    return "Sistema de traslación";
  }

  if (
    texto.includes("placa") ||
    texto.includes("serie") ||
    texto.includes("identificacion") ||
    texto.includes("document")
  ) {
    return "Documentación / identificación";
  }

  if (
    texto.includes("mecan") ||
    texto.includes("engranaje") ||
    texto.includes("rodamiento") ||
    texto.includes("lubricacion")
  ) {
    return "Sistema mecánico";
  }

  return "General";
}

function extraerItemsDesdeSections(payload: PayloadDiagnosticoIA): ChecklistItemNormalizado[] {
  const checklist = payload.checklist;
  const respuestasExternas = payload.respuestas || {};

  if (!checklist?.sections || !Array.isArray(checklist.sections)) return [];

  const items: ChecklistItemNormalizado[] = [];

  checklist.sections.forEach((section: any) => {
    const nombreSeccion = textoSeguro(section.nombre || section.titulo || section.label || section.id);
    const listaItems = Array.isArray(section.items) ? section.items : [];

    listaItems.forEach((item: any) => {
      const itemId = textoSeguro(item.id || item.key || item.label || item.nombre);
      const respuesta = item.respuesta || respuestasExternas[itemId] || {};
      const estado = normalizarEstado(respuesta.estado || respuesta.resultado || item.estado);

      if (!estado) return;

      const nombre =
        textoSeguro(item.label) ||
        textoSeguro(item.nombre) ||
        textoSeguro(item.titulo) ||
        textoSeguro(item.name) ||
        itemId ||
        "Ítem checklist";

      const categoriaBase =
        textoSeguro(item.sistema) ||
        textoSeguro(item.categoria) ||
        textoSeguro(item.seccion) ||
        nombreSeccion;

      items.push({
        id: itemId || nombre,
        nombre,
        estado,
        categoria: normalizarCategoria(`${categoriaBase} ${nombre}`),
        observacion:
          textoSeguro(respuesta.observacion) ||
          textoSeguro(respuesta.observación) ||
          textoSeguro(respuesta.comentario) ||
          textoSeguro(respuesta.detalle),
        acciones: Array.isArray(respuesta.acciones) ? respuesta.acciones.map(String) : [],
        repuestoNombre: textoSeguro(respuesta.repuesto_nombre || respuesta.repuestoNombre),
        repuestoCantidad: textoSeguro(respuesta.repuesto_cantidad || respuesta.repuestoCantidad || "1"),
        afectaSeguridad: Boolean(item.afectaSeguridad || item.afecta_seguridad),
      });
    });
  });

  return items;
}

function extraerItemsDesdeItemsMalos(payload: PayloadDiagnosticoIA): ChecklistItemNormalizado[] {
  const itemsMalos = Array.isArray(payload.itemsMalos) ? payload.itemsMalos : [];

  return itemsMalos
    .map((registro: any) => {
      const item = registro.item || {};
      const respuesta = registro.respuesta || {};
      const nombre =
        textoSeguro(item.label) ||
        textoSeguro(item.nombre) ||
        textoSeguro(item.titulo) ||
        textoSeguro(item.name) ||
        textoSeguro(item.id) ||
        "Ítem observado";

      return {
        id: textoSeguro(item.id) || nombre,
        nombre,
        estado: "malo" as EstadoChecklist,
        categoria: normalizarCategoria(`${item.sistema || item.categoria || ""} ${nombre}`),
        observacion: textoSeguro(respuesta.observacion),
        acciones: Array.isArray(respuesta.acciones) ? respuesta.acciones.map(String) : [],
        repuestoNombre: textoSeguro(respuesta.repuesto_nombre),
        repuestoCantidad: textoSeguro(respuesta.repuesto_cantidad || "1"),
        afectaSeguridad: Boolean(item.afectaSeguridad || item.afecta_seguridad),
      };
    })
    .filter((item) => item.nombre);
}

function deduplicarItems(items: ChecklistItemNormalizado[]) {
  const mapa = new Map<string, ChecklistItemNormalizado>();

  items.forEach((item) => {
    const clave = `${item.id}-${item.nombre}`;
    const anterior = mapa.get(clave);

    if (!anterior) {
      mapa.set(clave, item);
      return;
    }

    if (anterior.estado !== "malo" && item.estado === "malo") {
      mapa.set(clave, item);
    }
  });

  return Array.from(mapa.values());
}

function extraerItemsChecklist(payload: PayloadDiagnosticoIA): ChecklistItemNormalizado[] {
  const desdeSections = extraerItemsDesdeSections(payload);
  const desdeMalos = extraerItemsDesdeItemsMalos(payload);
  return deduplicarItems([...desdeSections, ...desdeMalos]);
}

function nombreEquipo(payload: PayloadDiagnosticoIA) {
  const equipo = payload.equipo || {};
  return [
    textoSeguro(equipo.tipoEquipo || equipo.tipo),
    textoSeguro(equipo.marca),
    textoSeguro(equipo.modelo),
    textoSeguro(equipo.capacidad),
  ]
    .filter(Boolean)
    .join(" ") || "Equipo";
}

function construirTextoTecnicoNatural(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
) {
  const equipo = nombreEquipo(payload).toLowerCase();
  const malos = items.filter((item) => item.estado === "malo");
  const regulares = items.filter((item) => item.estado === "regular");
  const observados = [...malos, ...regulares];

  if (!observados.length) {
    return `El ${equipo} no presenta observaciones críticas registradas en el checklist. Se recomienda realizar una prueba funcional final y mantener el programa de mantenimiento preventivo antes de liberar el equipo.`;
  }

  const detalle = observados
    .map((item) => {
      const obs = item.observacion ? ` (${item.observacion})` : "";
      return `${item.nombre}${obs}`;
    })
    .join(", ");

  const haySeguridad = observados.some(
    (item) =>
      item.afectaSeguridad ||
      item.categoria === "Sistema de seguridad" ||
      item.categoria === "Sistema de elevación / tracción" ||
      normalizarTexto(item.nombre).includes("freno") ||
      normalizarTexto(item.nombre).includes("gancho") ||
      normalizarTexto(item.nombre).includes("cable") ||
      normalizarTexto(item.nombre).includes("cadena"),
  );

  if (haySeguridad) {
    return `El ${equipo} presenta deficiencias en componentes relevantes para su operación segura: ${detalle}. Estas condiciones pueden comprometer la seguridad del equipo durante la operación, por lo que se recomienda no liberarlo hasta realizar la corrección correspondiente y ejecutar una prueba funcional posterior.`;
  }

  return `El ${equipo} presenta observaciones técnicas en los siguientes puntos: ${detalle}. Se recomienda corregir estas condiciones antes de su liberación, verificar funcionamiento general y dejar registro de los trabajos realizados.`;
}

function construirProcedimientoLocal(items: ChecklistItemNormalizado[]) {
  const observados = items.filter((item) => item.estado !== "bueno");

  if (!observados.length) {
    return ["Realizar validación final y prueba funcional del equipo."];
  }

  const pasos = observados.map((item) => {
    const nombre = item.nombre.toLowerCase();

    if (normalizarTexto(nombre).includes("freno")) {
      return `Revisar, ajustar o reemplazar componente de freno asociado a ${item.nombre}.`;
    }

    if (normalizarTexto(nombre).includes("cable") || normalizarTexto(nombre).includes("cadena")) {
      return `Revisar condición de ${item.nombre} y reemplazar si presenta desgaste, deformación o daño visible.`;
    }

    if (normalizarTexto(nombre).includes("gancho")) {
      return `Revisar apertura, seguro y deformación de ${item.nombre}; reemplazar si no cumple condición segura.`;
    }

    if (normalizarTexto(nombre).includes("enchufe") || normalizarTexto(nombre).includes("alimentacion")) {
      return `Normalizar alimentación eléctrica asociada a ${item.nombre}.`;
    }

    return `Corregir observación registrada en ${item.nombre}.`;
  });

  pasos.push("Ejecutar prueba funcional posterior a la reparación antes de liberar el equipo.");
  return pasos;
}

function construirRepuestosLocal(items: ChecklistItemNormalizado[]) {
  const repuestos = items
    .filter((item) => item.estado !== "bueno")
    .flatMap((item) => {
      if (item.repuestoNombre) {
        return [
          {
            cantidad: Number(item.repuestoCantidad || 1) || 1,
            nombre: item.repuestoNombre,
            prioridad: item.estado === "malo" ? "alta" : "media",
            motivo: `Ítem observado en checklist: ${item.nombre}`,
          },
        ];
      }

      if (item.acciones.includes("repuesto")) {
        return [
          {
            cantidad: 1,
            nombre: item.nombre,
            prioridad: item.estado === "malo" ? "alta" : "media",
            motivo: `El checklist indica necesidad de repuesto en ${item.nombre}.`,
          },
        ];
      }

      return [];
    });

  return repuestos;
}

function clasificarRiesgo(items: ChecklistItemNormalizado[]) {
  const malos = items.filter((item) => item.estado === "malo");
  const observados = items.filter((item) => item.estado !== "bueno");
  const haySeguridad = observados.some(
    (item) =>
      item.afectaSeguridad ||
      item.categoria === "Sistema de seguridad" ||
      item.categoria === "Sistema de elevación / tracción" ||
      normalizarTexto(item.nombre).includes("freno") ||
      normalizarTexto(item.nombre).includes("gancho") ||
      normalizarTexto(item.nombre).includes("cable") ||
      normalizarTexto(item.nombre).includes("cadena"),
  );

  if (malos.length >= 2 || haySeguridad) {
    return {
      nivel: "alto",
      clasificacion: "No Apto",
      justificacion:
        "Existen observaciones en componentes que pueden afectar la operación segura del equipo.",
    };
  }

  if (observados.length > 0) {
    return {
      nivel: "medio",
      clasificacion: "Apto con observaciones",
      justificacion:
        "El equipo presenta observaciones que deben corregirse o validarse antes de su liberación definitiva.",
    };
  }

  return {
    nivel: "bajo",
    clasificacion: "Apto",
    justificacion:
      "No se registran observaciones críticas en el checklist informado.",
  };
}

function generarDiagnosticoLocal(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
) {
  const equipo = nombreEquipo(payload);
  const observados = items.filter((item) => item.estado !== "bueno");
  const riesgo = clasificarRiesgo(items);
  const textoTecnicoNatural = construirTextoTecnicoNatural(payload, items);
  const procedimiento = construirProcedimientoLocal(items);
  const repuestos = construirRepuestosLocal(items);
  const horasMin = observados.length ? Math.max(1, Math.ceil(observados.length * 0.75)) : 0.5;
  const horasMax = observados.length ? Math.max(2, Math.ceil(observados.length * 1.5)) : 1;

  return {
    resumenEjecutivo: {
      equipoLlegado: equipo,
      estadoGeneral: observados.length
        ? `Equipo con ${observados.length} observación(es) técnica(s) registradas en checklist.`
        : "Equipo sin observaciones críticas registradas en checklist.",
      nivelRiesgo: riesgo.nivel,
      conclusion:
        riesgo.clasificacion === "Apto"
          ? "Equipo apto según checklist, sujeto a validación funcional final."
          : "Equipo requiere corrección y validación técnica antes de ser liberado.",
    },
    hallazgosTecnicos: observados.length
      ? observados.map((item) => ({
          categoria: item.categoria,
          estado: item.estado === "malo" ? "deficiente" : "observado",
          detalle: `${item.nombre}${item.observacion ? `: ${item.observacion}` : ""}`,
          evidenciaChecklist: [item.nombre],
          severidad: item.estado === "malo" ? "alta" : "media",
        }))
      : [
          {
            categoria: "General",
            estado: "correcto",
            detalle: "Checklist sin observaciones críticas registradas.",
            evidenciaChecklist: [],
            severidad: "baja",
          },
        ],
    causaProbable: observados.length
      ? [
          {
            causa: "Desgaste operacional, falta de mantenimiento preventivo o condición de uso",
            justificacion:
              "Las observaciones registradas en checklist corresponden a componentes que normalmente se deterioran por uso, falta de mantención o exigencia operacional.",
            confianza: "media",
          },
        ]
      : [
          {
            causa: "Sin causa de falla evidente",
            justificacion: "El checklist no registra fallas críticas suficientes para establecer una causa de falla.",
            confianza: "baja",
          },
        ],
    riesgo: {
      clasificacion: riesgo.clasificacion,
      justificacion: riesgo.justificacion,
    },
    procedimientoRecomendado: procedimiento.map((trabajo, index) => ({
      paso: index + 1,
      trabajo,
      prioridad: index === procedimiento.length - 1 ? "media" : riesgo.nivel === "alto" ? "alta" : "media",
      requiereRepuesto: repuestos.length > 0 && index === 0,
      observacion: "Validar físicamente en taller antes de cotizar o liberar.",
    })),
    repuestosSugeridos: repuestos,
    horasEstimadas: {
      minimo: horasMin,
      maximo: horasMax,
      detalle: "Estimación preliminar calculada según cantidad y severidad de observaciones registradas.",
      supuesto: "Debe ser ajustada por el jefe técnico según inspección física y disponibilidad de repuestos.",
    },
    observacionesCliente:
      riesgo.clasificacion === "Apto"
        ? "El equipo no presenta observaciones críticas según la revisión registrada. Se recomienda mantener mantenimiento preventivo periódico."
        : "El equipo presenta observaciones técnicas que deben corregirse antes de su liberación. MJ Industrial informará los trabajos y repuestos requeridos.",
    textoTecnicoNatural,
    confianzaDiagnostico: observados.length ? "media" : "baja",
    conocimientoUtilizado: [],
    advertencias: [],
  };
}

function construirPromptSistema() {
  return `
Eres el Jefe Técnico Senior de MJ Industrial, empresa especialista en izaje y manejo de carga.

Debes diagnosticar equipos como tecles eléctricos, tecles manuales, tecles palanca, winches, tirfor, minifor y transpaletas eléctricas.

Tu respuesta debe ser JSON válido, sin markdown, sin texto adicional.

El diagnóstico debe sonar como un técnico senior real, no como una lista genérica de IA.

Reglas:
- No inventes datos fuera del checklist.
- Usa lenguaje técnico, directo y natural.
- Prioriza seguridad operacional.
- Si hay observaciones en freno, gancho, cable, cadena, limitador, estructura o alimentación eléctrica, considera riesgo alto o no apto.
- El campo textoTecnicoNatural debe ser un párrafo claro similar a un informe técnico de taller.
- Los repuestos solo deben sugerirse si están justificados por checklist o por una falla evidente.
- Las horas son estimadas y editables por el jefe técnico.
`.trim();
}

function construirPromptUsuario(payload: PayloadDiagnosticoIA, items: ChecklistItemNormalizado[]) {
  return JSON.stringify({
    instruccion:
      "Genera diagnóstico técnico para MJ Industrial. Devuelve exclusivamente JSON válido con la estructura indicada.",
    estructura_obligatoria: {
      resumenEjecutivo: {
        equipoLlegado: "string",
        estadoGeneral: "string",
        nivelRiesgo: "bajo | medio | alto | critico",
        conclusion: "string",
      },
      hallazgosTecnicos: [
        {
          categoria: "string",
          estado: "correcto | observado | deficiente | critico",
          detalle: "string",
          evidenciaChecklist: ["string"],
          severidad: "baja | media | alta | critica",
        },
      ],
      causaProbable: [
        {
          causa: "string",
          justificacion: "string",
          confianza: "baja | media | alta",
        },
      ],
      riesgo: {
        clasificacion: "Apto | Apto con observaciones | No Apto",
        justificacion: "string",
      },
      procedimientoRecomendado: [
        {
          paso: 1,
          trabajo: "string",
          prioridad: "baja | media | alta | critica",
          requiereRepuesto: true,
          observacion: "string",
        },
      ],
      repuestosSugeridos: [
        {
          cantidad: 1,
          nombre: "string",
          prioridad: "baja | media | alta | critica",
          motivo: "string",
        },
      ],
      horasEstimadas: {
        minimo: 1,
        maximo: 2,
        detalle: "string",
        supuesto: "string",
      },
      observacionesCliente: "string",
      textoTecnicoNatural: "Párrafo técnico natural, estilo informe de taller MJ Industrial.",
      confianzaDiagnostico: "baja | media | alta",
      conocimientoUtilizado: [],
      advertencias: ["string"],
    },
    equipo: payload.equipo || {},
    problemaReportado: payload.problemaReportado || "",
    observacionesIngreso: payload.observacionesIngreso || payload.observaciones || "",
    checklistNormalizado: items,
  });
}

async function guardarDiagnosticoEnOrden(
  payload: PayloadDiagnosticoIA,
  diagnostico: any,
  fuente: string,
) {
  const supabase = crearSupabaseAdmin();
  const ordenId = payload.ordenId || payload.equipoId;

  if (!supabase || !ordenId) return;

  const { error } = await supabase
    .from("ordenes")
    .update({
      diagnostico_ia_json: diagnostico,
      diagnostico_ia_version: "mj-senior-v2",
      diagnostico_ia_fuente: fuente,
      diagnostico_ia_generado_en: new Date().toISOString(),
    })
    .eq("id", ordenId);

  if (error) {
    console.error("Error guardando diagnóstico IA en orden:", error);
  }
}

export async function POST(request: NextRequest) {
  let payload: PayloadDiagnosticoIA | null = null;

  try {
    payload = (await request.json()) as PayloadDiagnosticoIA;
    const items = extraerItemsChecklist(payload);
    const openai = crearOpenAI();

    if (!openai) {
      const diagnosticoLocal = {
  ...generarDiagnosticoLocal(payload, items),
  advertencias: [
    "Diagnóstico generado por motor local porque OPENAI_API_KEY no está disponible.",
  ],
};
      await guardarDiagnosticoEnOrden(payload, diagnosticoLocal, "local_sin_openai_key");

      return NextResponse.json({
        ok: true,
        fuente: "local_sin_openai_key",
        diagnostico: diagnosticoLocal,
      });
    }

    try {
      const completion = await openai.chat.completions.create({
        model: MODELO_DIAGNOSTICO,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: construirPromptSistema(),
          },
          {
            role: "user",
            content: construirPromptUsuario(payload, items),
          },
        ],
      });

      const contenido = completion.choices[0]?.message?.content;

      if (!contenido) {
        throw new Error("OpenAI no entregó contenido.");
      }

      const diagnostico = JSON.parse(contenido);

      if (!diagnostico.textoTecnicoNatural) {
        diagnostico.textoTecnicoNatural = construirTextoTecnicoNatural(payload, items);
      }

      await guardarDiagnosticoEnOrden(payload, diagnostico, "openai");

      return NextResponse.json({
        ok: true,
        fuente: "openai",
        diagnostico,
      });
    } catch (error) {
      console.error("OpenAI falló, usando diagnóstico local:", error);

      const diagnosticoLocal = {
  ...generarDiagnosticoLocal(payload, items),
  advertencias: [
    "Diagnóstico generado por motor local porque OpenAI no respondió correctamente.",
  ],
};

      await guardarDiagnosticoEnOrden(payload, diagnosticoLocal, "local_respaldo_openai");

      return NextResponse.json({
        ok: true,
        fuente: "local_respaldo_openai",
        diagnostico: diagnosticoLocal,
      });
    }
  } catch (error) {
    console.error("Error en /api/diagnostico-ia:", error);

    if (payload) {
      const items = extraerItemsChecklist(payload);
      const diagnosticoLocal = {
  ...generarDiagnosticoLocal(payload, items),
  advertencias: [
    "Diagnóstico generado por motor local por error general en la API.",
  ],
};

      await guardarDiagnosticoEnOrden(payload, diagnosticoLocal, "local_error_api");

      return NextResponse.json({
        ok: true,
        fuente: "local_error_api",
        diagnostico: diagnosticoLocal,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo generar el diagnóstico IA.",
      },
      { status: 500 },
    );
  }
}
