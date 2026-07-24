import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import {
  buscarConocimientoRelevante,
  prepararConocimientoParaOpenAI,
} from "./biblioteca";
import type {
  ConocimientoSeleccionado,
  ItemDiagnosticoBiblioteca,
} from "./biblioteca";

export const runtime = "nodejs";

type EstadoChecklist = "bueno" | "regular" | "malo";

type ChecklistItemNormalizado = ItemDiagnosticoBiblioteca & {
  categoria: string;
  accionOtro: string;
};

type PayloadDiagnosticoIA = {
  ordenId?: string | null;
  equipoId?: string | null;

  equipo?: {
    tipo?: string | null;
    tipoEquipo?: string | null;
    equipo?: string | null;
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

  tecnicoACargo?: string | null;

  tecnico_a_cargo?: string | null;
};

type RiesgoDiagnostico = {
  nivel: "bajo" | "medio" | "alto" | "critico";
  clasificacion: "Apto" | "Apto con observaciones" | "No Apto";
  justificacion: string;
};

const MODELO_DIAGNOSTICO =
  process.env.OPENAI_MODEL_DIAGNOSTICO || "gpt-4o-mini";

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

function normalizarTexto(valor: unknown): string {
  return textoSeguro(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizarListaTexto(valor: unknown): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.map((registro) => textoSeguro(registro)).filter(Boolean);
}

function normalizarEstado(valor: unknown): EstadoChecklist | null {
  const texto = normalizarTexto(valor);

  if (
    [
      "bueno",
      "bien",
      "ok",
      "correcto",
      "aprobado",
      "operativo",
    ].includes(texto)
  ) {
    return "bueno";
  }

  if (
    [
      "regular",
      "observado",
      "observacion",
      "con observacion",
    ].includes(texto)
  ) {
    return "regular";
  }

  if (
    [
      "malo",
      "mal",
      "deficiente",
      "rechazado",
      "critico",
      "critica",
      "no operativo",
    ].includes(texto)
  ) {
    return "malo";
  }

  return null;
}

function normalizarCriticidad(
  valor: unknown,
): "baja" | "media" | "alta" | "critica" | undefined {
  const texto = normalizarTexto(valor);

  if (texto === "baja") return "baja";
  if (texto === "media") return "media";
  if (texto === "alta") return "alta";
  if (texto === "critica" || texto === "critico") return "critica";

  return undefined;
}

function normalizarTipoEquipo(valor: unknown): string {
  const texto = normalizarTexto(valor).trim();

  const equivalencias: Record<string, string> = {
    "tecle electrico": "tecle_electrico",
    tecle_electrico: "tecle_electrico",

    "tecle manual": "tecle_manual",
    tecle_manual: "tecle_manual",

    "tecle de palanca": "tecle_palanca",
    "tecle palanca": "tecle_palanca",
    tecle_palanca: "tecle_palanca",

    winche: "winche",
    tirfor: "tirfor",
    minifor: "minifor",

    "transpaleta electrica": "transpaleta_electrica",
    transpaleta: "transpaleta_electrica",
    transpaleta_electrica: "transpaleta_electrica",
  };

  return equivalencias[texto] || texto.replace(/\s+/g, "_");
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
    texto.includes("pestillo") ||
    texto.includes("traba")
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
    texto.includes("traccion") ||
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
    texto.includes("hidraulic") ||
    texto.includes("bomba") ||
    texto.includes("cilindro") ||
    texto.includes("valvula") ||
    texto.includes("aceite")
  ) {
    return "Sistema hidráulico";
  }

  if (
    texto.includes("mecan") ||
    texto.includes("engranaje") ||
    texto.includes("pinon") ||
    texto.includes("rodamiento") ||
    texto.includes("lubricacion") ||
    texto.includes("eje")
  ) {
    return "Sistema mecánico";
  }

  if (
    texto.includes("operatividad") ||
    texto.includes("prueba") ||
    texto.includes("ruido")
  ) {
    return "Operatividad";
  }

  return "General";
}

function crearItemNormalizado(
  itemOriginal: any,
  respuestaOriginal: any,
  nombreSeccion: string,
  estadoForzado?: EstadoChecklist,
): ChecklistItemNormalizado | null {
  const item = itemOriginal || {};
  const respuesta = respuestaOriginal || {};

  const id =
    textoSeguro(item.id) ||
    textoSeguro(item.key) ||
    textoSeguro(item.label) ||
    textoSeguro(item.nombre);

  const nombre =
    textoSeguro(item.label) ||
    textoSeguro(item.nombre) ||
    textoSeguro(item.titulo) ||
    textoSeguro(item.name) ||
    id ||
    "Ítem checklist";

  const estado =
    estadoForzado ||
    normalizarEstado(
      respuesta.estado ||
        respuesta.resultado ||
        item.estado ||
        item.resultado,
    );

  if (!estado) {
    return null;
  }

  const sistema =
    textoSeguro(item.sistema) ||
    textoSeguro(item.categoria) ||
    textoSeguro(item.seccion) ||
    nombreSeccion ||
    "general";

  return {
    id: id || nombre,
    nombre,
    estado,
    categoria: normalizarCategoria(`${sistema} ${nombre}`),
    observacion:
      textoSeguro(respuesta.observacion) ||
      textoSeguro(respuesta.observación) ||
      textoSeguro(respuesta.comentario) ||
      textoSeguro(respuesta.detalle),
    acciones: normalizarListaTexto(respuesta.acciones),
    accionOtro:
      textoSeguro(respuesta.accion_otro) ||
      textoSeguro(respuesta.accionOtro),
    repuestoNombre:
      textoSeguro(respuesta.repuesto_nombre) ||
      textoSeguro(respuesta.repuestoNombre),
    repuestoCantidad:
      textoSeguro(
        respuesta.repuesto_cantidad ||
          respuesta.repuestoCantidad ||
          "1",
      ) || "1",
    criticidad: normalizarCriticidad(
      item.criticidad || respuesta.criticidad,
    ),
    sistema,
    afectaSeguridad: Boolean(
      item.afectaSeguridad ||
        item.afecta_seguridad ||
        respuesta.afectaSeguridad ||
        respuesta.afecta_seguridad,
    ),
  };
}

function extraerItemsDesdeSecciones(
  payload: PayloadDiagnosticoIA,
): ChecklistItemNormalizado[] {
  const checklist = payload.checklist || {};
  const respuestasExternas = payload.respuestas || {};

  const secciones = Array.isArray(checklist.sections)
    ? checklist.sections
    : Array.isArray(checklist.secciones)
      ? checklist.secciones
      : [];

  if (!secciones.length) {
    return [];
  }

  const items: ChecklistItemNormalizado[] = [];

  secciones.forEach((seccion: any) => {
    const nombreSeccion =
      textoSeguro(seccion.nombre) ||
      textoSeguro(seccion.titulo) ||
      textoSeguro(seccion.label) ||
      textoSeguro(seccion.id);

    const listaItems = Array.isArray(seccion.items)
      ? seccion.items
      : [];

    listaItems.forEach((registro: any) => {
      const item =
        registro?.item && typeof registro.item === "object"
          ? registro.item
          : registro;

      const itemId =
        textoSeguro(item?.id) ||
        textoSeguro(item?.key) ||
        textoSeguro(item?.label) ||
        textoSeguro(item?.nombre);

      const respuesta =
        registro?.respuesta ||
        item?.respuesta ||
        respuestasExternas[itemId] ||
        {};

      const normalizado = crearItemNormalizado(
        item,
        respuesta,
        nombreSeccion,
      );

      if (normalizado) {
        items.push(normalizado);
      }
    });
  });

  return items;
}

function extraerItemsDesdeRespuestas(
  payload: PayloadDiagnosticoIA,
): ChecklistItemNormalizado[] {
  const respuestas = payload.respuestas || {};

  if (!respuestas || typeof respuestas !== "object") {
    return [];
  }

  return Object.entries(respuestas)
    .map(([itemId, respuesta]) =>
      crearItemNormalizado(
        {
          id: itemId,
          label: itemId,
        },
        respuesta,
        "General",
      ),
    )
    .filter(
      (item): item is ChecklistItemNormalizado => Boolean(item),
    );
}

function extraerItemsDesdeItemsMalos(
  payload: PayloadDiagnosticoIA,
): ChecklistItemNormalizado[] {
  const itemsRaiz = Array.isArray(payload.itemsMalos)
    ? payload.itemsMalos
    : [];

  const itemsChecklist = Array.isArray(payload.checklist?.itemsMalos)
    ? payload.checklist.itemsMalos
    : [];

  const registros = [...itemsRaiz, ...itemsChecklist];

  return registros
    .map((registro: any) => {
      const item =
        registro?.item && typeof registro.item === "object"
          ? registro.item
          : registro;

      const respuesta =
        registro?.respuesta ||
        item?.respuesta ||
        {};

      return crearItemNormalizado(
        item,
        respuesta,
        textoSeguro(item?.sistema || item?.categoria),
        "malo",
      );
    })
    .filter(
      (item): item is ChecklistItemNormalizado => Boolean(item),
    );
}

function completarItem(
  anterior: ChecklistItemNormalizado,
  nuevo: ChecklistItemNormalizado,
): ChecklistItemNormalizado {
  const estado =
    anterior.estado === "malo" || nuevo.estado === "malo"
      ? "malo"
      : anterior.estado === "regular" || nuevo.estado === "regular"
        ? "regular"
        : "bueno";

  return {
    ...anterior,
    ...nuevo,
    estado,
    nombre: nuevo.nombre || anterior.nombre,
    categoria: nuevo.categoria || anterior.categoria,
    observacion: nuevo.observacion || anterior.observacion,
    acciones:
      nuevo.acciones.length > 0
        ? nuevo.acciones
        : anterior.acciones,
    accionOtro: nuevo.accionOtro || anterior.accionOtro,
    repuestoNombre:
      nuevo.repuestoNombre || anterior.repuestoNombre,
    repuestoCantidad:
      nuevo.repuestoCantidad || anterior.repuestoCantidad,
    criticidad: nuevo.criticidad || anterior.criticidad,
    sistema: nuevo.sistema || anterior.sistema,
    afectaSeguridad:
      nuevo.afectaSeguridad || anterior.afectaSeguridad,
  };
}

function deduplicarItems(
  items: ChecklistItemNormalizado[],
): ChecklistItemNormalizado[] {
  const mapa = new Map<string, ChecklistItemNormalizado>();

  items.forEach((item) => {
    const clave = item.id || item.nombre;
    const anterior = mapa.get(clave);

    if (!anterior) {
      mapa.set(clave, item);
      return;
    }

    mapa.set(clave, completarItem(anterior, item));
  });

  return Array.from(mapa.values());
}

function extraerItemsChecklist(
  payload: PayloadDiagnosticoIA,
): ChecklistItemNormalizado[] {
  const desdeSecciones = extraerItemsDesdeSecciones(payload);
  const desdeRespuestas = extraerItemsDesdeRespuestas(payload);
  const desdeItemsMalos = extraerItemsDesdeItemsMalos(payload);

  return deduplicarItems([
    ...desdeSecciones,
    ...desdeRespuestas,
    ...desdeItemsMalos,
  ]);
}

function obtenerTipoEquipo(payload: PayloadDiagnosticoIA): string {
  const equipo = payload.equipo || {};

  return normalizarTipoEquipo(
    equipo.tipoEquipo ||
      equipo.tipo ||
      equipo.equipo ||
      equipo.nombreChecklist,
  );
}

function nombreEquipo(payload: PayloadDiagnosticoIA): string {
  const equipo = payload.equipo || {};

  const tipoVisible =
    textoSeguro(equipo.nombreChecklist) ||
    textoSeguro(equipo.equipo) ||
    textoSeguro(equipo.tipoEquipo || equipo.tipo) ||
    "Equipo";

  return [
    tipoVisible,
    textoSeguro(equipo.marca),
    textoSeguro(equipo.modelo),
    textoSeguro(equipo.capacidad),
  ]
    .filter(Boolean)
    .join(" ");
}


function conocimientoPorComponente(
  conocimiento: ConocimientoSeleccionado[],
  componenteId: string,
): ConocimientoSeleccionado | null {
  return (
    conocimiento.find(
      (registro) => registro.componente_id === componenteId,
    ) || null
  );
}

function accionLegible(accion: string): string {
  if (accion === "repuesto") return "reemplazo";
  if (accion === "reparacion") return "reparación";
  if (accion === "ajuste") return "ajuste";
  if (accion === "mantencion") return "mantención";

  return accion || "revisión técnica";
}

function accionesLegibles(item: ChecklistItemNormalizado): string {
  const acciones = item.acciones
    .map((accion) => {
      if (accion === "otro" && item.accionOtro) {
        return item.accionOtro;
      }

      return accionLegible(accion);
    })
    .filter(Boolean);

  return acciones.join(", ");
}

function criticidadItem(
  item: ChecklistItemNormalizado,
  conocimiento: ConocimientoSeleccionado[],
): "baja" | "media" | "alta" | "critica" {
  const conocimientoItem = conocimientoPorComponente(
    conocimiento,
    item.id,
  );

  if (conocimientoItem?.criticidad) {
    return conocimientoItem.criticidad;
  }

  if (
    item.criticidad === "baja" ||
    item.criticidad === "media" ||
    item.criticidad === "alta" ||
    item.criticidad === "critica"
  ) {
    return item.criticidad;
  }

  if (item.afectaSeguridad) {
    return "alta";
  }

  return item.estado === "malo" ? "media" : "baja";
}

function clasificarRiesgo(
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
): RiesgoDiagnostico {
  const observados = items.filter(
    (item) => item.estado !== "bueno",
  );

  const criticidades = observados.map((item) =>
    criticidadItem(item, conocimiento),
  );

  const existeCritica = criticidades.includes("critica");

  const existeAlta = criticidades.includes("alta");

  const existeSeguridad = observados.some(
    (item) =>
      item.afectaSeguridad ||
      conocimientoPorComponente(conocimiento, item.id)
        ?.afecta_seguridad,
  );

  if (existeCritica) {
    return {
      nivel: "critico",
      clasificacion: "No Apto",
      justificacion:
        "Se registran hallazgos críticos que deben ser corregidos y validados antes de liberar el equipo.",
    };
  }

  if (existeAlta || existeSeguridad) {
    return {
      nivel: "alto",
      clasificacion: "No Apto",
      justificacion:
        "Se registran observaciones que pueden afectar la seguridad o la operación del equipo.",
    };
  }

  if (observados.length > 0) {
    return {
      nivel: "medio",
      clasificacion: "Apto con observaciones",
      justificacion:
        "El equipo presenta observaciones técnicas que deben corregirse o validarse antes de su liberación definitiva.",
    };
  }

  return {
    nivel: "bajo",
    clasificacion: "Apto",
    justificacion:
      "No se registran componentes en mal estado en el checklist informado.",
  };
}

function construirDetalleHallazgoLocal(
  item: ChecklistItemNormalizado,
  conocimiento: ConocimientoSeleccionado[],
): string {
  const registro = conocimientoPorComponente(
    conocimiento,
    item.id,
  );

  const partes: string[] = [];

  partes.push(
    `${item.nombre} fue marcado como ${
      item.estado === "malo" ? "malo" : "observado"
    } en el checklist.`,
  );

  if (item.observacion) {
    partes.push(
      `El técnico registró la observación: ${item.observacion}.`,
    );
  }

  const acciones = accionesLegibles(item);

  if (acciones) {
    partes.push(`La acción indicada es: ${acciones}.`);
  }

  if (registro?.riesgo_operacional) {
    partes.push(
      `Efecto operacional: ${registro.riesgo_operacional}.`,
    );
  } else if (item.afectaSeguridad) {
    partes.push(
      "La condición debe considerarse relevante para la seguridad operacional hasta que sea corregida y comprobada.",
    );
  }

  if (registro?.criterio_liberacion) {
    partes.push(
      `Condición de liberación: ${registro.criterio_liberacion}.`,
    );
  }

  return partes.join(" ");
}

function construirTextoTecnicoNatural(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
): string {
  const equipo = nombreEquipo(payload).toLowerCase();

  const observados = items.filter(
    (item) => item.estado !== "bueno",
  );

  if (!observados.length) {
    return `El ${equipo} no presenta componentes marcados como malos en el checklist. Antes de su liberación se debe completar la validación funcional final correspondiente al equipo.`;
  }

  const riesgo = clasificarRiesgo(items, conocimiento);

  const introduccion =
    riesgo.clasificacion === "No Apto"
      ? `El ${equipo} presenta hallazgos que requieren intervención antes de su liberación.`
      : `El ${equipo} presenta observaciones técnicas que deben ser revisadas antes de cerrar el diagnóstico.`;

  const detalles = observados.map((item) =>
    construirDetalleHallazgoLocal(item, conocimiento),
  );

  const cierre =
    riesgo.clasificacion === "No Apto"
      ? "El equipo no debe ser liberado mientras permanezcan pendientes las correcciones y las pruebas posteriores requeridas."
      : "La liberación debe quedar condicionada a la corrección de las observaciones y a la validación funcional final.";

  return [introduccion, ...detalles, cierre].join(" ");
}

function procedimientoBasePorAccion(
  item: ChecklistItemNormalizado,
): string {
  const nombre = item.nombre.toLowerCase();

  if (item.acciones.includes("repuesto")) {
    const repuesto =
      item.repuestoNombre || item.nombre;

    return `Reemplazar ${repuesto.toLowerCase()} por un componente compatible con el equipo y verificar su correcta instalación.`;
  }

  if (item.acciones.includes("reparacion")) {
    return `Reparar ${nombre} de acuerdo con la condición registrada por el técnico y comprobar su funcionamiento posterior.`;
  }

  if (item.acciones.includes("ajuste")) {
    return `Realizar el ajuste de ${nombre} y verificar que opere dentro de una condición funcional segura.`;
  }

  if (item.acciones.includes("mantencion")) {
    return `Ejecutar la mantención de ${nombre}, incluyendo limpieza, revisión y validación funcional.`;
  }

  if (item.acciones.includes("otro") && item.accionOtro) {
    return `${item.accionOtro} en ${nombre} y registrar el resultado de la intervención.`;
  }

  return `Revisar técnicamente ${nombre}, corregir la condición observada y validar su funcionamiento.`;
}

function construirProcedimientoLocal(
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
) {
  const observados = items.filter(
    (item) => item.estado !== "bueno",
  );

  if (!observados.length) {
    return [
      "Realizar prueba funcional final antes de liberar el equipo.",
    ];
  }

  const pasos: string[] = [];

  observados.forEach((item) => {
    const registro = conocimientoPorComponente(
      conocimiento,
      item.id,
    );

    const trabajo =
      registro?.procedimiento_recomendado ||
      procedimientoBasePorAccion(item);

    pasos.push(trabajo);

    if (registro?.prueba_posterior) {
      pasos.push(registro.prueba_posterior);
    }
  });

  pasos.push(
    "Registrar las correcciones realizadas y efectuar una validación funcional final antes de definir la liberación del equipo.",
  );

  return Array.from(new Set(pasos.filter(Boolean)));
}

function construirRepuestosLocal(
  items: ChecklistItemNormalizado[],
) {
  return items
    .filter(
      (item) =>
        item.estado !== "bueno" &&
        item.acciones.includes("repuesto"),
    )
    .map((item) => ({
      cantidad:
        Number(item.repuestoCantidad || 1) || 1,
      nombre:
        item.repuestoNombre ||
        item.nombre,
      prioridad:
        item.afectaSeguridad || item.estado === "malo"
          ? "alta"
          : "media",
      motivo:
        item.observacion ||
        `${item.nombre} marcado como malo en el checklist.`,
    }));
}

function construirHallazgosLocales(
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
) {
  const observados = items.filter(
    (item) => item.estado !== "bueno",
  );

  if (!observados.length) {
    return [
      {
        categoria: "General",
        estado: "correcto",
        detalle:
          "El checklist no registra componentes marcados como malos.",
        evidenciaChecklist: [],
        severidad: "baja",
      },
    ];
  }

  return observados.map((item) => {
    const criticidad = criticidadItem(
      item,
      conocimiento,
    );

    return {
      categoria: item.categoria,
      estado:
        criticidad === "critica"
          ? "critico"
          : item.estado === "malo"
            ? "deficiente"
            : "observado",
      detalle: construirDetalleHallazgoLocal(
        item,
        conocimiento,
      ),
      evidenciaChecklist: [
        item.nombre,
        ...(item.observacion
          ? [item.observacion]
          : []),
      ],
      severidad: criticidad,
    };
  });
}

function generarDiagnosticoLocal(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
) {
  const equipo = nombreEquipo(payload);
  const observados = items.filter(
    (item) => item.estado !== "bueno",
  );

  const riesgo = clasificarRiesgo(
    items,
    conocimiento,
  );

  const textoTecnicoNatural =
    construirTextoTecnicoNatural(
      payload,
      items,
      conocimiento,
    );

  const procedimiento =
    construirProcedimientoLocal(
      items,
      conocimiento,
    );

  const repuestos =
    construirRepuestosLocal(items);

  return {
    resumenEjecutivo: {
      equipoLlegado: equipo,
      estadoGeneral: observados.length
        ? `Equipo con ${observados.length} hallazgo(s) técnico(s) registrado(s) en el checklist.`
        : "Equipo sin componentes marcados como malos en el checklist.",
      nivelRiesgo: riesgo.nivel,
      conclusion:
        riesgo.clasificacion === "Apto"
          ? "Equipo sujeto a validación funcional final."
          : "Equipo sujeto a corrección y validación antes de su liberación.",
    },

    hallazgosTecnicos:
      construirHallazgosLocales(
        items,
        conocimiento,
      ),

    causaProbable: observados.length
      ? [
          {
            causa:
              "La causa exacta debe confirmarse mediante inspección técnica.",
            justificacion:
              "El checklist identifica la condición observada, pero no permite afirmar una causa no registrada por el técnico.",
            confianza: "baja",
          },
        ]
      : [
          {
            causa:
              "Sin causa de falla identificada.",
            justificacion:
              "No se registran componentes malos suficientes para establecer una causa.",
            confianza: "baja",
          },
        ],

    riesgo: {
      clasificacion: riesgo.clasificacion,
      justificacion: riesgo.justificacion,
    },

    procedimientoRecomendado:
      procedimiento.map((trabajo, index) => ({
        paso: index + 1,
        trabajo,
        prioridad:
          riesgo.nivel === "critico"
            ? "critica"
            : riesgo.nivel === "alto"
              ? "alta"
              : "media",
        requiereRepuesto:
          index === 0 && repuestos.length > 0,
        observacion:
          "Validar físicamente en taller y registrar el resultado.",
      })),

    repuestosSugeridos: repuestos,

    horasEstimadas: {
      minimo: observados.length
        ? Math.max(1, observados.length)
        : 0.5,
      maximo: observados.length
        ? Math.max(2, observados.length * 2)
        : 1,
      detalle:
        "Estimación preliminar basada en la cantidad de hallazgos.",
      supuesto:
        "Las horas deben ser revisadas y ajustadas por el jefe técnico.",
    },

    observacionesCliente:
      riesgo.clasificacion === "Apto"
        ? "El equipo queda sujeto a validación funcional final."
        : "El equipo presenta observaciones técnicas que deben ser corregidas antes de su liberación.",

    textoTecnicoNatural,

    confianzaDiagnostico:
      conocimiento.length > 0
        ? "media"
        : "baja",

    conocimientoUtilizado:
      conocimiento.map((registro) => ({
        registroId: registro.id,
        componenteId:
          registro.componente_id,
        fallaClave: registro.falla_clave,
        puntaje: registro.puntaje,
      })),

    advertencias:
      conocimiento.length > 0
        ? []
        : [
            "No se encontraron registros técnicos aplicables en la biblioteca para los componentes observados.",
          ],
  };
}

function construirPromptSistema() {
  return `
Eres el Jefe Técnico Senior de MJ Industrial, empresa especialista en equipos de izaje y manejo de carga.

Debes analizar tecles eléctricos, tecles manuales, tecles de palanca, winches, tirfor, minifor y transpaletas eléctricas.

Tu respuesta debe ser exclusivamente JSON válido, sin markdown y sin texto adicional.

REGLAS OBLIGATORIAS:

1. El checklist y las observaciones escritas por el técnico son la fuente principal de información.

2. La Biblioteca Técnica solo debe utilizarse cuando corresponda al mismo tipo de equipo y al mismo componente.

3. No inventes:
- Mediciones.
- Porcentajes de desgaste.
- Pruebas ya realizadas.
- Causas no observadas.
- Repuestos no seleccionados.
- Normas no entregadas.
- Datos de marca, modelo o capacidad no informados.

4. No reemplaces la observación del técnico por una falla más específica que no esté sustentada.

5. Para cada componente malo debes explicar:
- Qué fue observado.
- Qué acción seleccionó el técnico.
- Qué efecto puede tener en la operación.
- Qué condición debe cumplirse antes de liberar el equipo.

6. Debes diferenciar:
- Reemplazo.
- Reparación.
- Ajuste.
- Mantención.
- Otra acción.

7. Los repuestos deben respetar exactamente el nombre y cantidad ingresados en el checklist.

8. No sugieras repuestos cuando el técnico no seleccionó la acción "repuesto".

9. No agrupes todos los componentes en una sola frase genérica.

10. El procedimiento debe tener acciones concretas y ordenadas para los hallazgos actuales.

11. El procedimiento debe incluir las pruebas posteriores relevantes que aparezcan en la biblioteca.

12. Un equipo con una condición crítica o de seguridad pendiente no debe ser liberado.

13. El campo textoTecnicoNatural debe ser un informe técnico claro, profesional y comprensible.

14. Las horas son preliminares y siempre deben quedar sujetas a revisión del jefe técnico.
`.trim();
}

function construirPromptUsuario(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
) {
  return JSON.stringify({
    instruccion:
      "Genera un diagnóstico técnico para MJ Industrial utilizando exclusivamente la información entregada.",

    estructura_obligatoria: {
      resumenEjecutivo: {
        equipoLlegado: "string",
        estadoGeneral: "string",
        nivelRiesgo:
          "bajo | medio | alto | critico",
        conclusion: "string",
      },

      hallazgosTecnicos: [
        {
          categoria: "string",
          estado:
            "correcto | observado | deficiente | critico",
          detalle: "string",
          evidenciaChecklist: ["string"],
          severidad:
            "baja | media | alta | critica",
        },
      ],

      causaProbable: [
        {
          causa: "string",
          justificacion: "string",
          confianza:
            "baja | media | alta",
        },
      ],

      riesgo: {
        clasificacion:
          "Apto | Apto con observaciones | No Apto",
        justificacion: "string",
      },

      procedimientoRecomendado: [
        {
          paso: 1,
          trabajo: "string",
          prioridad:
            "baja | media | alta | critica",
          requiereRepuesto: true,
          observacion: "string",
        },
      ],

      repuestosSugeridos: [
        {
          cantidad: 1,
          nombre: "string",
          prioridad:
            "baja | media | alta | critica",
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

      textoTecnicoNatural:
        "Informe técnico natural y específico.",

      confianzaDiagnostico:
        "baja | media | alta",

      conocimientoUtilizado: [
        {
          registroId: "string",
          componenteId: "string",
          fallaClave: "string",
        },
      ],

      advertencias: ["string"],
    },

    tipoEquipo:
      obtenerTipoEquipo(payload),

    equipo:
      payload.equipo || {},

    problemaReportado:
      payload.problemaReportado || "",

    observacionesIngreso:
      payload.observacionesIngreso ||
      payload.observaciones ||
      "",

    checklistNormalizado: items,

    bibliotecaTecnicaRelevante:
      prepararConocimientoParaOpenAI(
        conocimiento,
      ),
  });
}

function normalizarDiagnosticoOpenAI(
  diagnosticoOriginal: any,
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
  conocimiento: ConocimientoSeleccionado[],
) {
  const respaldo = generarDiagnosticoLocal(
    payload,
    items,
    conocimiento,
  );

  const diagnostico =
    diagnosticoOriginal &&
    typeof diagnosticoOriginal === "object"
      ? diagnosticoOriginal
      : {};

  const repuestosExactos =
    construirRepuestosLocal(items);

  return {
    ...respaldo,
    ...diagnostico,

    resumenEjecutivo: {
      ...respaldo.resumenEjecutivo,
      ...(diagnostico.resumenEjecutivo || {}),
    },

    hallazgosTecnicos:
      Array.isArray(
        diagnostico.hallazgosTecnicos,
      ) &&
      diagnostico.hallazgosTecnicos.length > 0
        ? diagnostico.hallazgosTecnicos
        : respaldo.hallazgosTecnicos,

    causaProbable:
      Array.isArray(
        diagnostico.causaProbable,
      ) &&
      diagnostico.causaProbable.length > 0
        ? diagnostico.causaProbable
        : respaldo.causaProbable,

    riesgo: {
      ...respaldo.riesgo,
      ...(diagnostico.riesgo || {}),
    },

    procedimientoRecomendado:
      Array.isArray(
        diagnostico.procedimientoRecomendado,
      ) &&
      diagnostico.procedimientoRecomendado.length > 0
        ? diagnostico.procedimientoRecomendado
        : respaldo.procedimientoRecomendado,

    repuestosSugeridos: repuestosExactos,

    horasEstimadas: {
      ...respaldo.horasEstimadas,
      ...(diagnostico.horasEstimadas || {}),
    },

    textoTecnicoNatural:
      textoSeguro(
        diagnostico.textoTecnicoNatural,
      ) ||
      respaldo.textoTecnicoNatural,

    conocimientoUtilizado:
      conocimiento.map((registro) => ({
        registroId: registro.id,
        componenteId:
          registro.componente_id,
        fallaClave:
          registro.falla_clave,
        puntaje:
          registro.puntaje,
      })),

    advertencias: Array.isArray(
      diagnostico.advertencias,
    )
      ? diagnostico.advertencias
      : respaldo.advertencias,
  };
}

async function guardarDiagnosticoEnOrden(
  payload: PayloadDiagnosticoIA,
  diagnostico: any,
  fuente: string,
) {
  const supabase = crearSupabaseAdmin();

  const ordenId =
    payload.ordenId ||
    payload.equipoId;

  if (!supabase || !ordenId) {
    return;
  }

  const { error } = await supabase
    .from("ordenes")
    .update({
      diagnostico_ia_json: diagnostico,
      diagnostico_ia_version:
        "mj-biblioteca-v1",
      diagnostico_ia_fuente: fuente,
      diagnostico_ia_generado_en:
        new Date().toISOString(),
    })
    .eq("id", ordenId);

  if (error) {
    console.error(
      "Error guardando diagnóstico IA en orden:",
      error,
    );
  }
}

async function obtenerConocimiento(
  payload: PayloadDiagnosticoIA,
  items: ChecklistItemNormalizado[],
): Promise<ConocimientoSeleccionado[]> {
  const supabase = crearSupabaseAdmin();

  if (!supabase) {
    return [];
  }

  const tipoEquipo =
    obtenerTipoEquipo(payload);

  if (!tipoEquipo) {
    return [];
  }

  return buscarConocimientoRelevante(
    supabase,
    tipoEquipo,
    items,
    3,
  );
}

export async function POST(
  request: NextRequest,
) {
  let payload: PayloadDiagnosticoIA | null =
    null;

  try {
    payload =
      (await request.json()) as PayloadDiagnosticoIA;

    const items =
      extraerItemsChecklist(payload);

    const conocimiento =
      await obtenerConocimiento(
        payload,
        items,
      );

    const openai = crearOpenAI();

    if (!openai) {
      const diagnosticoLocal = {
        ...generarDiagnosticoLocal(
          payload,
          items,
          conocimiento,
        ),

        advertencias: [
          "Diagnóstico generado por el Motor MJ porque OPENAI_API_KEY no está disponible.",
        ],
      };

      await guardarDiagnosticoEnOrden(
        payload,
        diagnosticoLocal,
        "local_sin_openai_key",
      );

      return NextResponse.json({
        ok: true,
        fuente: "local_sin_openai_key",
        conocimientoEncontrado:
          conocimiento.length,
        itemsNormalizados: items.length,
        diagnostico: diagnosticoLocal,
      });
    }

    try {
      const completion =
        await openai.chat.completions.create({
          model: MODELO_DIAGNOSTICO,
          temperature: 0.1,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                construirPromptSistema(),
            },
            {
              role: "user",
              content:
                construirPromptUsuario(
                  payload,
                  items,
                  conocimiento,
                ),
            },
          ],
        });

      const contenido =
        completion.choices[0]
          ?.message?.content;

      if (!contenido) {
        throw new Error(
          "OpenAI no entregó contenido.",
        );
      }

      const respuestaOpenAI =
        JSON.parse(contenido);

      const diagnostico =
        normalizarDiagnosticoOpenAI(
          respuestaOpenAI,
          payload,
          items,
          conocimiento,
        );

      await guardarDiagnosticoEnOrden(
        payload,
        diagnostico,
        "openai_biblioteca",
      );

      return NextResponse.json({
        ok: true,
        fuente: "openai_biblioteca",
        conocimientoEncontrado:
          conocimiento.length,
        itemsNormalizados: items.length,
        diagnostico,
      });
    } catch (error) {
      console.error(
        "OpenAI falló, usando Motor MJ:",
        error,
      );

      const diagnosticoLocal = {
        ...generarDiagnosticoLocal(
          payload,
          items,
          conocimiento,
        ),

        advertencias: [
          "Diagnóstico generado por el Motor MJ porque OpenAI no respondió correctamente.",
        ],
      };

      await guardarDiagnosticoEnOrden(
        payload,
        diagnosticoLocal,
        "local_respaldo_openai",
      );

      return NextResponse.json({
        ok: true,
        fuente:
          "local_respaldo_openai",
        conocimientoEncontrado:
          conocimiento.length,
        itemsNormalizados: items.length,
        diagnostico: diagnosticoLocal,
      });
    }
  } catch (error) {
    console.error(
      "Error en /api/diagnostico-ia:",
      error,
    );

    if (payload) {
      const items =
        extraerItemsChecklist(payload);

      const conocimiento =
        await obtenerConocimiento(
          payload,
          items,
        );

      const diagnosticoLocal = {
        ...generarDiagnosticoLocal(
          payload,
          items,
          conocimiento,
        ),

        advertencias: [
          "Diagnóstico generado por el Motor MJ debido a un error general de la API.",
        ],
      };

      await guardarDiagnosticoEnOrden(
        payload,
        diagnosticoLocal,
        "local_error_api",
      );

      return NextResponse.json({
        ok: true,
        fuente: "local_error_api",
        conocimientoEncontrado:
          conocimiento.length,
        itemsNormalizados: items.length,
        diagnostico: diagnosticoLocal,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo generar el diagnóstico IA.",
      },
      {
        status: 500,
      },
    );
  }
}