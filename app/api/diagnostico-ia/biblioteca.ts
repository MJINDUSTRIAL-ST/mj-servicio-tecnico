export type EstadoItemBiblioteca = "bueno" | "regular" | "malo";

export type ItemDiagnosticoBiblioteca = {
  id: string;
  nombre: string;
  estado: EstadoItemBiblioteca;
  observacion: string;
  acciones: string[];
  accionOtro?: string;
  repuestoNombre: string;
  repuestoCantidad: string;
  criticidad?: string;
  sistema?: string;
  afectaSeguridad: boolean;
};

export type RegistroBibliotecaDiagnostico = {
  id: string;
  tipo_equipo: string;
  grupo: string;
  componente_id: string;
  componente_nombre: string;
  falla_clave: string;
  falla_descripcion: string;
  sintomas: string[];
  palabras_clave: string[];
  sistema: string;
  riesgo_operacional: string;
  criticidad: "baja" | "media" | "alta" | "critica";
  afecta_seguridad: boolean;
  acciones_recomendadas: string[];
  procedimiento_recomendado: string;
  repuesto_frecuente: string | null;
  prueba_posterior: string;
  criterio_liberacion: string;
  norma_referencia: string | null;
  fuente: string | null;
  prioridad: number;
};

export type ConocimientoSeleccionado = RegistroBibliotecaDiagnostico & {
  puntaje: number;
  observacionChecklist: string;
  accionesChecklist: string[];
};

function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function normalizarTexto(valor: unknown): string {
  return textoSeguro(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarLista(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];

  return valor
    .map((registro) => textoSeguro(registro))
    .filter(Boolean);
}

function palabrasTexto(valor: unknown): string[] {
  const texto = normalizarTexto(valor);

  if (!texto) return [];

  return Array.from(
    new Set(
      texto
        .split(" ")
        .map((palabra) => palabra.trim())
        .filter((palabra) => palabra.length >= 3),
    ),
  );
}

function calcularCoincidencias(
  palabrasObservacion: string[],
  palabrasRegistro: string[],
): number {
  if (!palabrasObservacion.length || !palabrasRegistro.length) return 0;

  const conjuntoRegistro = new Set(palabrasRegistro);

  return palabrasObservacion.filter((palabra) =>
    conjuntoRegistro.has(palabra),
  ).length;
}

function puntuarRegistro(
  item: ItemDiagnosticoBiblioteca,
  registro: RegistroBibliotecaDiagnostico,
): number {
  let puntaje = 0;

  if (registro.componente_id === item.id) {
    puntaje += 100;
  }

  const observacion = normalizarTexto(item.observacion);
  const acciones = item.acciones.map(normalizarTexto).filter(Boolean);

  const textoRegistro = [
    registro.componente_nombre,
    registro.falla_clave,
    registro.falla_descripcion,
    registro.riesgo_operacional,
    registro.procedimiento_recomendado,
    registro.repuesto_frecuente,
    ...normalizarLista(registro.sintomas),
    ...normalizarLista(registro.palabras_clave),
    ...normalizarLista(registro.acciones_recomendadas),
  ].join(" ");

  const palabrasObservacion = palabrasTexto(observacion);
  const palabrasRegistro = palabrasTexto(textoRegistro);

  const coincidencias = calcularCoincidencias(
    palabrasObservacion,
    palabrasRegistro,
  );

  puntaje += coincidencias * 12;

  acciones.forEach((accion) => {
    const accionesBiblioteca = normalizarLista(
      registro.acciones_recomendadas,
    ).map(normalizarTexto);

    if (accionesBiblioteca.includes(accion)) {
      puntaje += 15;
    }
  });

  if (
    item.afectaSeguridad &&
    (registro.afecta_seguridad ||
      registro.criticidad === "alta" ||
      registro.criticidad === "critica")
  ) {
    puntaje += 20;
  }

  if (
    item.criticidad &&
    normalizarTexto(item.criticidad) === normalizarTexto(registro.criticidad)
  ) {
    puntaje += 10;
  }

  if (
    item.sistema &&
    normalizarTexto(item.sistema) === normalizarTexto(registro.sistema)
  ) {
    puntaje += 8;
  }

  puntaje += Math.max(0, 10 - Math.floor((registro.prioridad || 100) / 10));

  return puntaje;
}

function normalizarRegistro(
  registro: any,
): RegistroBibliotecaDiagnostico {
  return {
    id: textoSeguro(registro.id),
    tipo_equipo: textoSeguro(registro.tipo_equipo),
    grupo: textoSeguro(registro.grupo) || "General",
    componente_id: textoSeguro(registro.componente_id),
    componente_nombre: textoSeguro(registro.componente_nombre),
    falla_clave:
      textoSeguro(registro.falla_clave) || "condicion_deficiente",
    falla_descripcion: textoSeguro(registro.falla_descripcion),
    sintomas: normalizarLista(registro.sintomas),
    palabras_clave: normalizarLista(registro.palabras_clave),
    sistema: textoSeguro(registro.sistema) || "general",
    riesgo_operacional: textoSeguro(registro.riesgo_operacional),
    criticidad:
      registro.criticidad === "baja" ||
      registro.criticidad === "media" ||
      registro.criticidad === "alta" ||
      registro.criticidad === "critica"
        ? registro.criticidad
        : "media",
    afecta_seguridad: Boolean(registro.afecta_seguridad),
    acciones_recomendadas: normalizarLista(
      registro.acciones_recomendadas,
    ),
    procedimiento_recomendado: textoSeguro(
      registro.procedimiento_recomendado,
    ),
    repuesto_frecuente:
      textoSeguro(registro.repuesto_frecuente) || null,
    prueba_posterior: textoSeguro(registro.prueba_posterior),
    criterio_liberacion: textoSeguro(registro.criterio_liberacion),
    norma_referencia:
      textoSeguro(registro.norma_referencia) || null,
    fuente: textoSeguro(registro.fuente) || null,
    prioridad: Number(registro.prioridad || 100),
  };
}

export async function buscarConocimientoRelevante(
  supabase: any,
  tipoEquipo: string,
  items: ItemDiagnosticoBiblioteca[],
  maximoPorComponente = 3,
): Promise<ConocimientoSeleccionado[]> {
  const itemsObservados = items.filter(
    (item) => item.estado === "malo" || item.estado === "regular",
  );

  if (!tipoEquipo || !itemsObservados.length) {
    return [];
  }

  const componentesIds = Array.from(
    new Set(
      itemsObservados
        .map((item) => textoSeguro(item.id))
        .filter(Boolean),
    ),
  );

  if (!componentesIds.length) {
    return [];
  }

  const limiteConsulta = Math.max(componentesIds.length * 8, 20);

  const { data, error } = await supabase
    .from("biblioteca_diagnostico")
    .select(
      `
        id,
        tipo_equipo,
        grupo,
        componente_id,
        componente_nombre,
        falla_clave,
        falla_descripcion,
        sintomas,
        palabras_clave,
        sistema,
        riesgo_operacional,
        criticidad,
        afecta_seguridad,
        acciones_recomendadas,
        procedimiento_recomendado,
        repuesto_frecuente,
        prueba_posterior,
        criterio_liberacion,
        norma_referencia,
        fuente,
        prioridad
      `,
    )
    .eq("tipo_equipo", tipoEquipo)
    .eq("activo", true)
    .in("componente_id", componentesIds)
    .order("prioridad", { ascending: true })
    .limit(limiteConsulta);

  if (error) {
    console.error(
      "No se pudo consultar la biblioteca de diagnóstico:",
      error,
    );
    return [];
  }

  const registros: RegistroBibliotecaDiagnostico[] = ((data || []) as any[]).map(
  (registro: any) => normalizarRegistro(registro),
);
  const seleccionados: ConocimientoSeleccionado[] = [];

  itemsObservados.forEach((item) => {
    const candidatos = registros
      .filter((registro) => registro.componente_id === item.id)
      .map((registro) => ({
        ...registro,
        puntaje: puntuarRegistro(item, registro),
        observacionChecklist: item.observacion,
        accionesChecklist: item.acciones,
      }))
      .sort((a, b) => {
        if (b.puntaje !== a.puntaje) {
          return b.puntaje - a.puntaje;
        }

        return a.prioridad - b.prioridad;
      })
      .slice(0, maximoPorComponente);

    seleccionados.push(...candidatos);
  });

  const mapa = new Map<string, ConocimientoSeleccionado>();

  seleccionados.forEach((registro) => {
    const anterior = mapa.get(registro.id);

    if (!anterior || registro.puntaje > anterior.puntaje) {
      mapa.set(registro.id, registro);
    }
  });

  return Array.from(mapa.values()).sort((a, b) => {
    if (b.puntaje !== a.puntaje) {
      return b.puntaje - a.puntaje;
    }

    return a.prioridad - b.prioridad;
  });
}

export function prepararConocimientoParaOpenAI(
  conocimiento: ConocimientoSeleccionado[],
) {
  return conocimiento.map((registro) => ({
    registroId: registro.id,
    tipoEquipo: registro.tipo_equipo,
    grupo: registro.grupo,
    componenteId: registro.componente_id,
    componente: registro.componente_nombre,
    fallaClave: registro.falla_clave,
    fallaDescripcion: registro.falla_descripcion,
    sintomas: registro.sintomas,
    riesgoOperacional: registro.riesgo_operacional,
    criticidad: registro.criticidad,
    afectaSeguridad: registro.afecta_seguridad,
    accionesRecomendadas: registro.acciones_recomendadas,
    procedimientoRecomendado: registro.procedimiento_recomendado,
    repuestoFrecuente: registro.repuesto_frecuente,
    pruebaPosterior: registro.prueba_posterior,
    criterioLiberacion: registro.criterio_liberacion,
    normaReferencia: registro.norma_referencia,
    observacionChecklist: registro.observacionChecklist,
    accionesChecklist: registro.accionesChecklist,
    puntajeCoincidencia: registro.puntaje,
  }));
}