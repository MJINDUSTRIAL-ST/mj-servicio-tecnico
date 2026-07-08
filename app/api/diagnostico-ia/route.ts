import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type EstadoChecklist = "bueno" | "regular" | "malo";

type ChecklistItemNormalizado = {
  nombre: string;
  estado: EstadoChecklist;
  categoria: string;
  observacion: string;
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
    capacidad?: string | null;
    anio?: string | number | null;
    año?: string | number | null;
  } | null;
  checklist?: unknown;
  problemaReportado?: string | null;
  observacionesIngreso?: string | null;
};

const MODELO_DIAGNOSTICO = "gpt-4.1-mini";
const MODELO_EMBEDDING = "text-embedding-3-small";

const DIAGNOSTICO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumenEjecutivo: {
      type: "object",
      additionalProperties: false,
      properties: {
        equipoLlegado: { type: "string" },
        estadoGeneral: { type: "string" },
        nivelRiesgo: {
          type: "string",
          enum: ["bajo", "medio", "alto", "critico"],
        },
        conclusion: { type: "string" },
      },
      required: ["equipoLlegado", "estadoGeneral", "nivelRiesgo", "conclusion"],
    },
    hallazgosTecnicos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          categoria: {
            type: "string",
            enum: [
              "Sistema mecánico",
              "Sistema eléctrico",
              "Sistema de seguridad",
              "Sistema estructural",
              "Sistema de elevación",
              "Sistema de traslación",
              "Documentación / identificación",
              "General",
            ],
          },
          estado: {
            type: "string",
            enum: ["correcto", "observado", "deficiente", "critico"],
          },
          detalle: { type: "string" },
          evidenciaChecklist: {
            type: "array",
            items: { type: "string" },
          },
          severidad: {
            type: "string",
            enum: ["baja", "media", "alta", "critica"],
          },
        },
        required: [
          "categoria",
          "estado",
          "detalle",
          "evidenciaChecklist",
          "severidad",
        ],
      },
    },
    causaProbable: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          causa: { type: "string" },
          justificacion: { type: "string" },
          confianza: {
            type: "string",
            enum: ["baja", "media", "alta"],
          },
        },
        required: ["causa", "justificacion", "confianza"],
      },
    },
    riesgo: {
      type: "object",
      additionalProperties: false,
      properties: {
        clasificacion: {
          type: "string",
          enum: ["Apto", "Apto con observaciones", "No Apto"],
        },
        justificacion: { type: "string" },
      },
      required: ["clasificacion", "justificacion"],
    },
    procedimientoRecomendado: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          paso: { type: "number" },
          trabajo: { type: "string" },
          prioridad: {
            type: "string",
            enum: ["baja", "media", "alta", "critica"],
          },
          requiereRepuesto: { type: "boolean" },
          observacion: { type: "string" },
        },
        required: [
          "paso",
          "trabajo",
          "prioridad",
          "requiereRepuesto",
          "observacion",
        ],
      },
    },
    repuestosSugeridos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          cantidad: { type: "number" },
          nombre: { type: "string" },
          prioridad: {
            type: "string",
            enum: ["baja", "media", "alta", "critica"],
          },
          motivo: { type: "string" },
        },
        required: ["cantidad", "nombre", "prioridad", "motivo"],
      },
    },
    horasEstimadas: {
      type: "object",
      additionalProperties: false,
      properties: {
        minimo: { type: "number" },
        maximo: { type: "number" },
        detalle: { type: "string" },
        supuesto: { type: "string" },
      },
      required: ["minimo", "maximo", "detalle", "supuesto"],
    },
    observacionesCliente: { type: "string" },
    confianzaDiagnostico: {
      type: "string",
      enum: ["baja", "media", "alta"],
    },
    conocimientoUtilizado: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          casoId: { type: "string" },
          similitud: { type: "number" },
          aprendizaje: { type: "string" },
        },
        required: ["casoId", "similitud", "aprendizaje"],
      },
    },
    advertencias: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "resumenEjecutivo",
    "hallazgosTecnicos",
    "causaProbable",
    "riesgo",
    "procedimientoRecomendado",
    "repuestosSugeridos",
    "horasEstimadas",
    "observacionesCliente",
    "confianzaDiagnostico",
    "conocimientoUtilizado",
    "advertencias",
  ],
};

function crearOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function crearSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

function normalizarEstado(valor: unknown): EstadoChecklist | null {
  const texto = textoSeguro(valor).toLowerCase();

  if (["bueno", "bien", "ok", "correcto", "aprobado"].includes(texto)) {
    return "bueno";
  }

  if (["regular", "observado", "observacion", "observación"].includes(texto)) {
    return "regular";
  }

  if (["malo", "mal", "deficiente", "rechazado", "critico", "crítico"].includes(texto)) {
    return "malo";
  }

  return null;
}

function normalizarCategoria(valor: unknown): string {
  const texto = textoSeguro(valor).toLowerCase();

  if (
    texto.includes("eléctr") ||
    texto.includes("motor") ||
    texto.includes("control") ||
    texto.includes("botonera") ||
    texto.includes("cable")
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
    texto.includes("bastidor")
  ) {
    return "Sistema estructural";
  }

  if (
    texto.includes("cadena") ||
    texto.includes("cable") ||
    texto.includes("tambor") ||
    texto.includes("elevación") ||
    texto.includes("elevacion")
  ) {
    return "Sistema de elevación";
  }

  if (
    texto.includes("carro") ||
    texto.includes("rueda") ||
    texto.includes("traslación") ||
    texto.includes("traslacion")
  ) {
    return "Sistema de traslación";
  }

  if (
    texto.includes("placa") ||
    texto.includes("serie") ||
    texto.includes("identificación") ||
    texto.includes("identificacion") ||
    texto.includes("document")
  ) {
    return "Documentación / identificación";
  }

  if (
    texto.includes("mecán") ||
    texto.includes("mecan") ||
    texto.includes("engranaje") ||
    texto.includes("rodamiento")
  ) {
    return "Sistema mecánico";
  }

  return "General";
}

function extraerItemsChecklist(checklist: unknown): ChecklistItemNormalizado[] {
  const items: ChecklistItemNormalizado[] = [];

  function recorrer(valor: unknown, ruta: string[] = []) {
    if (Array.isArray(valor)) {
      valor.forEach((item, index) => recorrer(item, [...ruta, `Ítem ${index + 1}`]));
      return;
    }

    if (!valor || typeof valor !== "object") {
      return;
    }

    const registro = valor as Record<string, unknown>;

    const estado =
      normalizarEstado(registro.estado) ||
      normalizarEstado(registro.respuesta) ||
      normalizarEstado(registro.valor) ||
      normalizarEstado(registro.resultado);

    if (estado) {
      const nombre =
        textoSeguro(registro.nombre) ||
        textoSeguro(registro.item) ||
        textoSeguro(registro.pregunta) ||
        textoSeguro(registro.titulo) ||
        ruta[ruta.length - 1] ||
        "Ítem checklist";

      const categoriaBase =
        textoSeguro(registro.categoria) ||
        textoSeguro(registro.seccion) ||
        textoSeguro(registro.sistema) ||
        ruta.join(" / ");

      const observacion =
        textoSeguro(registro.observacion) ||
        textoSeguro(registro.observación) ||
        textoSeguro(registro.comentario) ||
        textoSeguro(registro.detalle);

      items.push({
        nombre,
        estado,
        categoria: normalizarCategoria(`${categoriaBase} ${nombre}`),
        observacion,
      });
    }

    Object.entries(registro).forEach(([clave, contenido]) => {
      if (
        [
          "estado",
          "respuesta",
          "valor",
          "resultado",
          "nombre",
          "item",
          "pregunta",
          "titulo",
          "categoria",
          "seccion",
          "sistema",
          "observacion",
          "observación",
          "comentario",
          "detalle",
        ].includes(clave)
      ) {
        return;
      }

      recorrer(contenido, [...ruta, clave]);
    });
  }

  recorrer(checklist);

  return items;
}

function construirTextoBusqueda(payload: PayloadDiagnosticoIA, items: ChecklistItemNormalizado[]) {
  const equipo = payload.equipo || {};
  const tipo = textoSeguro(equipo.tipoEquipo || equipo.tipo);
  const marca = textoSeguro(equipo.marca);
  const modelo = textoSeguro(equipo.modelo);
  const capacidad = textoSeguro(equipo.capacidad);
  const problemaReportado = textoSeguro(payload.problemaReportado);
  const observacionesIngreso = textoSeguro(payload.observacionesIngreso);

  const itemsObservados = items
    .filter((item) => item.estado !== "bueno")
    .map((item) => {
      return `${item.categoria}: ${item.nombre} = ${item.estado}. ${item.observacion}`;
    })
    .join("\n");

  return [
    `Tipo equipo: ${tipo}`,
    `Marca: ${marca}`,
    `Modelo: ${modelo}`,
    `Capacidad: ${capacidad}`,
    `Problema reportado: ${problemaReportado}`,
    `Observaciones ingreso: ${observacionesIngreso}`,
    `Checklist observado:`,
    itemsObservados,
  ]
    .filter(Boolean)
    .join("\n");
}

async function buscarConocimientoHistorico(
  openai: OpenAI,
  textoBusqueda: string
) {
  const supabase = crearSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  try {
    const embedding = await openai.embeddings.create({
      model: MODELO_EMBEDDING,
      input: textoBusqueda,
      dimensions: 1536,
    });

    const vector = embedding.data[0]?.embedding;

    if (!vector) {
      return [];
    }

    const { data, error } = await supabase.rpc("match_conocimiento_mj_diagnosticos", {
      query_embedding: vector,
      match_count: 5,
      match_threshold: 0.72,
    });

    if (error) {
      console.error("Error buscando conocimiento histórico:", error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error generando embedding de búsqueda:", error);
    return [];
  }
}

function generarDiagnosticoLocalRespaldo(payload: PayloadDiagnosticoIA) {
  const equipo = payload.equipo || {};
  const items = extraerItemsChecklist(payload.checklist);
  const observados = items.filter((item) => item.estado !== "bueno");
  const malos = items.filter((item) => item.estado === "malo");
  const riesgoCritico = malos.length >= 3;
  const riesgoMedio = observados.length > 0;

  const clasificacion = riesgoCritico
    ? "No Apto"
    : riesgoMedio
      ? "Apto con observaciones"
      : "Apto";

  const nivelRiesgo = riesgoCritico ? "alto" : riesgoMedio ? "medio" : "bajo";

  return {
    resumenEjecutivo: {
      equipoLlegado: `${textoSeguro(equipo.tipoEquipo || equipo.tipo) || "Equipo"} ${textoSeguro(
        equipo.marca
      )} ${textoSeguro(equipo.modelo)} ${textoSeguro(equipo.capacidad)}`.trim(),
      estadoGeneral:
        observados.length > 0
          ? `Se detectan ${observados.length} observación(es) técnica(s) en checklist.`
          : "No se detectan observaciones críticas en el checklist informado.",
      nivelRiesgo,
      conclusion:
        clasificacion === "Apto"
          ? "Equipo apto según la información registrada, sujeto a revisión final del jefe técnico."
          : "Equipo requiere revisión técnica y corrección de observaciones antes de ser liberado.",
    },
    hallazgosTecnicos: observados.length
      ? observados.map((item) => ({
          categoria: normalizarCategoria(item.categoria),
          estado: item.estado === "malo" ? "deficiente" : "observado",
          detalle: `${item.nombre}: ${item.estado}. ${item.observacion}`.trim(),
          evidenciaChecklist: [item.nombre],
          severidad: item.estado === "malo" ? "alta" : "media",
        }))
      : [
          {
            categoria: "General",
            estado: "correcto",
            detalle: "Checklist sin observaciones relevantes registradas.",
            evidenciaChecklist: [],
            severidad: "baja",
          },
        ],
    causaProbable: observados.length
      ? [
          {
            causa: "Desgaste operacional o falta de mantenimiento preventivo",
            justificacion:
              "El checklist presenta observaciones que suelen relacionarse con uso continuo del equipo, desgaste de componentes o ausencia de mantención periódica.",
            confianza: "media",
          },
        ]
      : [
          {
            causa: "Sin causa de falla evidente",
            justificacion:
              "No existen observaciones suficientes en el checklist para determinar una causa probable.",
            confianza: "baja",
          },
        ],
    riesgo: {
      clasificacion,
      justificacion:
        clasificacion === "No Apto"
          ? "Existen observaciones deficientes que pueden comprometer la operación segura del equipo."
          : clasificacion === "Apto con observaciones"
            ? "El equipo puede requerir correcciones o seguimiento antes de una liberación definitiva."
            : "No se detectan condiciones críticas según el checklist informado.",
    },
    procedimientoRecomendado: observados.length
      ? observados.map((item, index) => ({
          paso: index + 1,
          trabajo: `Revisar y corregir: ${item.nombre}`,
          prioridad: item.estado === "malo" ? "alta" : "media",
          requiereRepuesto: item.estado === "malo",
          observacion: item.observacion || "Validar físicamente en banco de trabajo.",
        }))
      : [
          {
            paso: 1,
            trabajo: "Validación final y prueba funcional",
            prioridad: "baja",
            requiereRepuesto: false,
            observacion: "Confirmar funcionamiento antes de liberar el equipo.",
          },
        ],
    repuestosSugeridos: malos.map((item) => ({
      cantidad: 1,
      nombre: `Repuesto asociado a ${item.nombre}`,
      prioridad: "alta",
      motivo: item.observacion || "Ítem marcado como malo en checklist.",
    })),
    horasEstimadas: {
      minimo: observados.length > 0 ? Math.max(1, observados.length) : 0.5,
      maximo: observados.length > 0 ? Math.max(2, observados.length * 1.5) : 1,
      detalle:
        observados.length > 0
          ? "Estimación preliminar basada en cantidad de observaciones del checklist."
          : "Estimación mínima para validación final.",
      supuesto: "Debe ser ajustado por jefe técnico según inspección física.",
    },
    observacionesCliente:
      clasificacion === "Apto"
        ? "El equipo no presenta observaciones relevantes según la revisión registrada. Se recomienda mantener un programa de mantenimiento preventivo."
        : "El equipo presenta observaciones técnicas que deben ser revisadas antes de su liberación. MJ Industrial informará los trabajos y repuestos necesarios.",
    confianzaDiagnostico: "media",
    conocimientoUtilizado: [],
    advertencias: [
      "Diagnóstico generado por motor local de respaldo porque OpenAI no respondió correctamente.",
    ],
  };
}

function construirPromptSistema() {
  return `
Eres el Jefe Técnico Senior de MJ Industrial.

MJ Industrial trabaja con equipos de izaje y manejo de carga:
tecles eléctricos, tecles manuales, tecles palanca, winches, tirfor, minifor, transpaletas eléctricas y equipos relacionados.

Tu tarea NO es escribir un texto genérico.
Tu tarea es emitir un diagnóstico técnico profesional, claro, seguro y utilizable por:
1. técnico de taller,
2. jefe técnico,
3. vendedor que cotiza,
4. cliente final.

Reglas:
- No inventes datos que no estén en el checklist.
- Si falta información, indícalo en advertencias.
- Prioriza seguridad operacional.
- Usa lenguaje técnico para hallazgos.
- Usa lenguaje simple en observacionesCliente.
- Si hay riesgo en freno, gancho, cadena, cable, limitador, estructura o control eléctrico, aumenta el nivel de riesgo.
- Si el equipo no debería operar, clasifica como "No Apto".
- Si puede operar solo después de correcciones menores, clasifica como "Apto con observaciones".
- Si no hay fallas relevantes, clasifica como "Apto".
- Entrega procedimiento en orden lógico de trabajo.
- Sugiere repuestos solo cuando estén justificados por checklist o experiencia histórica.
- Las horas son estimadas y deben poder ser editadas por el jefe técnico.
`.trim();
}

function construirPromptUsuario(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
  conocimientoHistorico: unknown[]
) {
  return JSON.stringify(
    {
      instruccion:
        "Genera diagnóstico técnico estructurado para MJ Industrial usando checklist, datos del equipo y conocimiento histórico cuando sea pertinente.",
      equipo: payload.equipo || {},
      problemaReportado: payload.problemaReportado || "",
      observacionesIngreso: payload.observacionesIngreso || "",
      checklistNormalizado: items,
      checklistOriginal: payload.checklist || null,
      conocimientoHistoricoSimilar: conocimientoHistorico,
    },
    null,
    2
  );
}

async function guardarDiagnosticoEnOrden(
  payload: PayloadDiagnosticoIA,
  diagnostico: unknown,
  fuente: string
) {
  const supabase = crearSupabaseAdmin();

  if (!supabase || !payload.ordenId) {
    return;
  }

  const { error } = await supabase
    .from("ordenes")
    .update({
      diagnostico_ia_json: diagnostico,
      diagnostico_ia_version: "mj-senior-v1",
      diagnostico_ia_fuente: fuente,
      diagnostico_ia_generado_en: new Date().toISOString(),
    })
    .eq("id", payload.ordenId);

  if (error) {
    console.error("Error guardando diagnóstico IA en orden:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as PayloadDiagnosticoIA;
    const openai = crearOpenAI();
    const items = extraerItemsChecklist(payload.checklist);

    if (!openai) {
      const diagnosticoLocal = generarDiagnosticoLocalRespaldo(payload);
      await guardarDiagnosticoEnOrden(payload, diagnosticoLocal, "local_respaldo");

      return NextResponse.json({
        ok: true,
        fuente: "local_respaldo",
        diagnostico: diagnosticoLocal,
      });
    }

    const textoBusqueda = construirTextoBusqueda(payload, items);
    const conocimientoHistorico = await buscarConocimientoHistorico(openai, textoBusqueda);

    const completion = await openai.chat.completions.create({
      model: MODELO_DIAGNOSTICO,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: construirPromptSistema(),
        },
        {
          role: "user",
          content: construirPromptUsuario(payload, items, conocimientoHistorico),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "diagnostico_tecnico_mj_industrial",
          strict: true,
          schema: DIAGNOSTICO_SCHEMA,
        },
      },
    });

    const contenido = completion.choices[0]?.message?.content;

    if (!contenido) {
      throw new Error("OpenAI no entregó contenido.");
    }

    const diagnostico = JSON.parse(contenido);

    await guardarDiagnosticoEnOrden(payload, diagnostico, "openai");

    return NextResponse.json({
      ok: true,
      fuente: "openai",
      diagnostico,
      conocimientoHistoricoUsado: conocimientoHistorico.length,
    });
  } catch (error) {
    console.error("Error en /api/diagnostico-ia:", error);

    try {
      const payload = (await request.json()) as PayloadDiagnosticoIA;
      const diagnosticoLocal = generarDiagnosticoLocalRespaldo(payload);
      await guardarDiagnosticoEnOrden(payload, diagnosticoLocal, "local_respaldo_error_openai");

      return NextResponse.json({
        ok: true,
        fuente: "local_respaldo_error_openai",
        diagnostico: diagnosticoLocal,
      });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo generar el diagnóstico IA.",
        },
        { status: 500 }
      );
    }
  }
}