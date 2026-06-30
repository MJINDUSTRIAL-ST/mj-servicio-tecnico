export type TipoEquipoChecklist =
  | "tecle_electrico"
  | "tecle_manual"
  | "tecle_palanca"
  | "winche"
  | "tirfor"
  | "minifor"
  | "transpaleta_electrica";

export type EstadoChecklist = "bueno" | "malo" | "no_aplica";

export type CriticidadChecklist = "baja" | "media" | "alta" | "critica";

export type ChecklistItem = {
  id: string;
  label: string;
  sistema:
    | "visual"
    | "mecanico"
    | "electrico"
    | "hidraulico"
    | "traccion"
    | "seguridad"
    | "operatividad";
  criticidad: CriticidadChecklist;
  afectaSeguridad: boolean;
  repuestosSugeridos?: string[];
  procedimientosSugeridos?: string[];
};

export type ChecklistSection = {
  id: string;
  titulo: string;
  descripcion?: string;
  items: ChecklistItem[];
};

export type ChecklistEquipo = {
  tipo: TipoEquipoChecklist;
  nombre: string;
  descripcion: string;
  requiereMarca?: boolean;
  requiereModelo?: boolean;
  requiereSerie?: boolean;
  requiereCapacidad?: boolean;
  sections: ChecklistSection[];
};

const item = (
  id: string,
  label: string,
  sistema: ChecklistItem["sistema"],
  criticidad: CriticidadChecklist = "media",
  afectaSeguridad = false,
  repuestosSugeridos: string[] = [],
  procedimientosSugeridos: string[] = []
): ChecklistItem => ({
  id,
  label,
  sistema,
  criticidad,
  afectaSeguridad,
  repuestosSugeridos,
  procedimientosSugeridos,
});

export const CHECKLISTS: Record<TipoEquipoChecklist, ChecklistEquipo> = {
  tecle_electrico: {
    tipo: "tecle_electrico",
    nombre: "Tecle eléctrico",
    descripcion: "Checklist inteligente para tecle eléctrico con o sin carro.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "inspeccion_primaria",
        titulo: "Inspección primaria",
        items: [
          item("gancho_superior", "Gancho superior", "seguridad", "critica", true, ["Gancho superior"], ["Revisar deformación, seguro y desgaste"]),
          item("gancho_inferior", "Gancho inferior", "seguridad", "critica", true, ["Gancho inferior"], ["Revisar deformación, seguro y desgaste"]),
          item("cadena_izaje", "Cadena de izaje", "seguridad", "critica", true, ["Cadena de izaje"], ["Medir elongación, revisar fisuras y lubricar"]),
          item("bloque_conector", "Bloque conector / ramales", "mecanico", "alta", true, ["Bloque conector"], ["Revisar fijación y desgaste"]),
          item("cable_botonera", "Cable de botonera", "electrico", "alta", true, ["Cable de botonera"], ["Revisar continuidad y aislación"]),
          item("botonera", "Botonera", "electrico", "alta", true, ["Botonera"], ["Probar comandos de subida, bajada y emergencia"]),
          item("carcasa_general", "Carcasa en general", "visual", "media", false, [], ["Revisar golpes, fisuras y deformaciones"]),
          item("limpieza", "Limpieza general", "visual", "baja", false, [], ["Realizar limpieza técnica"]),
          item("cable_alimentacion", "Cable de alimentación eléctrica", "electrico", "alta", true, ["Cable de alimentación"], ["Revisar cortes, aislación y continuidad"]),
          item("enchufe_industrial", "Enchufe de alimentación industrial", "electrico", "alta", true, ["Enchufe industrial"], ["Revisar conexión y estado de pines"]),
          item("bolsa_cadena", "Bolsa guarda cadena", "mecanico", "media", false, ["Bolsa guarda cadena"], ["Revisar fijación y capacidad"]),
          item("prueba_vacio", "Pruebas en vacío", "operatividad", "alta", true, [], ["Probar funcionamiento sin carga"]),
        ],
      },
      {
        id: "componentes_mecanicos",
        titulo: "Componentes mecánicos",
        items: [
          item("perneria", "Pernería en general", "mecanico", "media", true, ["Pernos / tuercas"], ["Reapretar y reemplazar elementos dañados"]),
          item("rodamientos_motor", "Rodamientos del motor", "mecanico", "alta", false, ["Rodamientos"], ["Revisar ruido, juego y lubricación"]),
          item("freno_principal", "Disco de freno principal", "seguridad", "critica", true, ["Disco de freno"], ["Inspeccionar desgaste y reemplazar si corresponde"]),
          item("resorte_frenado", "Resorte de frenado", "seguridad", "critica", true, ["Resorte de freno"], ["Revisar tensión y fatiga"]),
          item("rotor", "Rotor", "electrico", "alta", false, ["Rotor"], ["Medir y revisar estado general"]),
          item("estator", "Estator", "electrico", "alta", false, ["Estator"], ["Medir bobinas y aislación"]),
          item("caja_reductora", "Caja reductora", "mecanico", "alta", true, ["Aceite / retenes / engranajes"], ["Revisar fugas, desgaste y lubricación"]),
          item("pinon_fuerza", "Piñón de fuerza", "mecanico", "alta", true, ["Piñón de fuerza"], ["Revisar dientes y desgaste"]),
          item("pinon_reduccion", "Piñón de reducción", "mecanico", "alta", true, ["Piñón de reducción"], ["Revisar dientes y desgaste"]),
          item("eje_central", "Eje central", "mecanico", "alta", true, ["Eje central"], ["Revisar deformación y desgaste"]),
          item("nuez_traccion", "Nuez de tracción", "seguridad", "critica", true, ["Nuez de tracción"], ["Revisar desgaste por cadena"]),
          item("guias_cadena", "Guías de cadena", "mecanico", "alta", true, ["Guías de cadena"], ["Revisar alineación y desgaste"]),
          item("limitador_mecanico", "Cardán / activación mecánica de limitador", "seguridad", "alta", true, ["Cardán limitador"], ["Revisar accionamiento"]),
          item("tope_cadena", "Tope de cadena final", "seguridad", "alta", true, ["Tope de cadena"], ["Revisar fijación"]),
        ],
      },
      {
        id: "componentes_electricos",
        titulo: "Componentes eléctricos",
        items: [
          item("caja_control", "Caja eléctrica de control", "electrico", "alta", true, ["Caja eléctrica"], ["Revisar conexiones internas"]),
          item("contactores", "Contactores de funcionamiento", "electrico", "alta", true, ["Contactores"], ["Revisar bobina, contactos y activación"]),
          item("bornera", "Bornera de conexionado", "electrico", "media", false, ["Bornera"], ["Reapretar y ordenar cableado"]),
          item("prensa_estopas", "Prensa estopas", "electrico", "media", false, ["Prensa estopas"], ["Revisar sellado y sujeción"]),
          item("medicion_bobinas", "Medición de bobinas", "electrico", "alta", false, [], ["Medir continuidad y resistencia"]),
          item("vdf", "VDF / variador", "electrico", "alta", false, ["VDF"], ["Revisar parámetros y funcionamiento"]),
          item("resistencia_frenado", "Resistencia de frenado", "electrico", "alta", true, ["Resistencia de frenado"], ["Medir resistencia y revisar temperatura"]),
          item("limit_switch", "Limit switch de corte superior e inferior", "seguridad", "critica", true, ["Limit switch"], ["Probar corte superior e inferior"]),
          item("transformador", "Transformador", "electrico", "media", false, ["Transformador"], ["Medir voltaje de salida"]),
          item("rele_fases", "Relé secuenciador de fases", "electrico", "alta", true, ["Relé secuenciador"], ["Revisar sentido de fases"]),
          item("cableado_control", "Cableado de control eléctrico", "electrico", "alta", true, ["Cableado de control"], ["Revisar continuidad, aislación y orden"]),
        ],
      },
      {
        id: "operatividad",
        titulo: "Pruebas de operatividad",
        items: [
          item("sentido_limitador", "Sentido de corte del limitador", "seguridad", "critica", true, [], ["Verificar corte superior e inferior"]),
          item("sentido_botonera", "Sentido correcto en botonera", "operatividad", "alta", true, [], ["Verificar comandos"]),
          item("pernos_pasadores_seguros", "Pernos, golillas, pasadores y seguros", "seguridad", "alta", true, ["Pasadores / seguros"], ["Revisar fijaciones críticas"]),
          item("prueba_carga", "Prueba de carga", "operatividad", "critica", true, [], ["Realizar prueba de carga según capacidad"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },

  tecle_manual: {
    tipo: "tecle_manual",
    nombre: "Tecle manual",
    descripcion: "Checklist inteligente para tecle manual de cadena.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "inspeccion_primaria",
        titulo: "Inspección primaria",
        items: [
          item("gancho_superior", "Gancho superior", "seguridad", "critica", true, ["Gancho superior"], ["Revisar seguro, deformación y garganta"]),
          item("gancho_inferior", "Gancho inferior", "seguridad", "critica", true, ["Gancho inferior"], ["Revisar seguro, deformación y garganta"]),
          item("cadena_izaje", "Cadena de izaje", "seguridad", "critica", true, ["Cadena de izaje"], ["Medir elongación y revisar desgaste"]),
          item("cadena_mando", "Cadena de mando", "mecanico", "media", false, ["Cadena de mando"], ["Revisar continuidad y desgaste"]),
          item("polea_operacion", "Polea de operación", "mecanico", "media", false, ["Polea de operación"], ["Revisar giro y desgaste"]),
          item("carcasa", "Carcasa en general", "visual", "media", false, [], ["Revisar golpes y deformaciones"]),
          item("limpieza", "Limpieza general", "visual", "baja", false, [], ["Realizar limpieza técnica"]),
          item("nuez_traccion", "Nuez de tracción", "seguridad", "critica", true, ["Nuez de tracción"], ["Revisar desgaste por cadena"]),
          item("guias_externas", "Componentes guías externos", "mecanico", "alta", true, ["Guías externas"], ["Revisar desgaste y alineación"]),
          item("prueba_vacio", "Pruebas en vacío", "operatividad", "alta", true, [], ["Probar funcionamiento sin carga"]),
        ],
      },
      {
        id: "componentes_internos",
        titulo: "Componentes internos",
        items: [
          item("tapa_polea", "Tapa delantera de polea", "mecanico", "media", false, ["Tapa delantera"], ["Revisar ajuste y estado"]),
          item("guias_polea", "Guías de tracción en polea de operación", "mecanico", "alta", true, ["Guías de polea"], ["Revisar desgaste"]),
          item("eslabones_mando", "Eslabones de cadena de mando", "mecanico", "media", false, ["Cadena de mando"], ["Revisar eslabones deformados"]),
          item("freno_pastilla_primaria", "Pastilla de freno primaria", "seguridad", "critica", true, ["Pastilla de freno primaria"], ["Revisar desgaste"]),
          item("disco_dentado_freno", "Disco dentado de freno", "seguridad", "critica", true, ["Disco dentado"], ["Revisar dientes y trabas"]),
          item("pastilla_freno_secundaria", "Pastilla de freno secundaria", "seguridad", "critica", true, ["Pastilla de freno secundaria"], ["Revisar desgaste"]),
          item("disco_freno_principal", "Disco de freno principal", "seguridad", "critica", true, ["Disco de freno"], ["Revisar desgaste"]),
          item("trabas_disco", "Trabas de disco dentado", "seguridad", "alta", true, ["Trabas de disco"], ["Revisar fijación"]),
          item("placa_a_b", "Placas A y B", "mecanico", "alta", true, ["Placas A/B"], ["Revisar pistas y anclajes"]),
          item("soporte_fin_cadena", "Soporte fin de cadena", "seguridad", "alta", true, ["Soporte fin de cadena"], ["Revisar fijación"]),
          item("eje_transmision", "Eje de transmisión central", "mecanico", "alta", true, ["Eje de transmisión"], ["Revisar desgaste"]),
          item("pinon_fuerza", "Piñón de fuerza", "mecanico", "alta", true, ["Piñón de fuerza"], ["Revisar dientes"]),
          item("pinones_reduccion", "Piñones de reducción", "mecanico", "alta", true, ["Piñones de reducción"], ["Revisar dientes"]),
          item("perneria", "Pernería en general", "mecanico", "media", true, ["Pernos / tuercas"], ["Reapretar y reemplazar"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },

  tecle_palanca: {
    tipo: "tecle_palanca",
    nombre: "Tecle de palanca",
    descripcion: "Checklist inteligente para tecle de palanca.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "inspeccion_primaria",
        titulo: "Inspección primaria",
        items: [
          item("gancho_superior", "Gancho superior", "seguridad", "critica", true, ["Gancho superior"], ["Revisar seguro y deformación"]),
          item("gancho_inferior", "Gancho inferior", "seguridad", "critica", true, ["Gancho inferior"], ["Revisar seguro y deformación"]),
          item("cadena_izaje", "Cadena de izaje", "seguridad", "critica", true, ["Cadena de izaje"], ["Medir elongación y revisar desgaste"]),
          item("palanca_traccion", "Palanca de tracción", "mecanico", "alta", true, ["Palanca de tracción"], ["Revisar accionamiento"]),
          item("selector_giro", "Selector de giro", "mecanico", "alta", true, ["Selector de giro"], ["Revisar avance, neutro y retroceso"]),
          item("carcasa", "Carcasa en general", "visual", "media", false, [], ["Revisar golpes y deformaciones"]),
          item("limpieza", "Limpieza general", "visual", "baja", false, [], ["Realizar limpieza técnica"]),
          item("nuez_traccion", "Nuez de tracción", "seguridad", "critica", true, ["Nuez de tracción"], ["Revisar desgaste"]),
          item("guias_externas", "Componentes guías externos", "mecanico", "alta", true, ["Guías externas"], ["Revisar alineación"]),
          item("prueba_vacio", "Pruebas en vacío", "operatividad", "alta", true, [], ["Probar sin carga"]),
        ],
      },
      {
        id: "componentes_internos",
        titulo: "Componentes internos",
        items: [
          item("componentes_palanca", "Componentes internos de palanca", "mecanico", "alta", true, ["Kit interno de palanca"], ["Revisar desgaste y accionamiento"]),
          item("freno_pastilla_primaria", "Pastilla de freno primaria", "seguridad", "critica", true, ["Pastilla de freno primaria"], ["Revisar desgaste"]),
          item("disco_dentado_freno", "Disco dentado de freno", "seguridad", "critica", true, ["Disco dentado"], ["Revisar dientes"]),
          item("pastilla_freno_secundaria", "Pastilla de freno secundaria", "seguridad", "critica", true, ["Pastilla de freno secundaria"], ["Revisar desgaste"]),
          item("disco_freno_principal", "Disco de freno principal", "seguridad", "critica", true, ["Disco de freno"], ["Revisar desgaste"]),
          item("trabas_disco", "Trabas de disco dentado", "seguridad", "alta", true, ["Trabas de disco"], ["Revisar fijación"]),
          item("placa_a_b", "Placas A y B", "mecanico", "alta", true, ["Placas A/B"], ["Revisar pistas y anclajes"]),
          item("soporte_fin_cadena", "Soporte fin de cadena", "seguridad", "alta", true, ["Soporte fin de cadena"], ["Revisar fijación"]),
          item("eje_transmision", "Eje de transmisión central", "mecanico", "alta", true, ["Eje de transmisión"], ["Revisar desgaste"]),
          item("pinon_fuerza", "Piñón de fuerza", "mecanico", "alta", true, ["Piñón de fuerza"], ["Revisar dientes"]),
          item("pinones_reduccion", "Piñones de reducción", "mecanico", "alta", true, ["Piñones de reducción"], ["Revisar dientes"]),
          item("perneria", "Pernería en general", "mecanico", "media", true, ["Pernos / tuercas"], ["Reapretar y reemplazar"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },

  winche: {
    tipo: "winche",
    nombre: "Winche",
    descripcion: "Checklist inteligente para winche eléctrico.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "ingreso",
        titulo: "Ingreso",
        items: [
          item("gancho_tiro", "Gancho de tiro", "seguridad", "critica", true, ["Gancho de tiro"], ["Revisar seguro, deformación y desgaste"]),
          item("cable_acero", "Cable de acero", "seguridad", "critica", true, ["Cable de acero"], ["Revisar diámetro, hebras cortadas y deformación"]),
          item("radio_control", "Radio control", "electrico", "alta", true, ["Radio control"], ["Probar todos los movimientos"]),
          item("botonera_colgante", "Botonera colgante", "electrico", "alta", true, ["Botonera"], ["Probar comandos"]),
          item("carcasa", "Carcasa en general", "visual", "media", false, [], ["Revisar golpes y deformaciones"]),
          item("limpieza", "Limpieza general", "visual", "baja", false, [], ["Realizar limpieza técnica"]),
          item("cable_alimentacion", "Cable de alimentación", "electrico", "alta", true, ["Cable de alimentación"], ["Revisar aislación y continuidad"]),
          item("enchufe_alimentador", "Enchufe alimentador", "electrico", "alta", true, ["Enchufe"], ["Revisar conexión y estado"]),
          item("prueba_vacio", "Pruebas en vacío", "operatividad", "alta", true, [], ["Probar sin carga"]),
        ],
      },
      {
        id: "componentes",
        titulo: "Inspección de componentes",
        items: [
          item("bobinado_motor", "Bobinado del motor", "electrico", "alta", false, ["Motor / bobinado"], ["Medir bobinas"]),
          item("freno_magnetico", "Freno magnético", "seguridad", "critica", true, ["Freno magnético"], ["Revisar accionamiento y desgaste"]),
          item("caja_reductora", "Anomalía en caja reductora", "mecanico", "alta", true, ["Engranajes / aceite / retenes"], ["Revisar ruido, fuga y lubricación"]),
          item("condensador_arranque", "Condensador de arranque", "electrico", "media", false, ["Condensador de arranque"], ["Medir µF"]),
          item("condensador_marcha", "Condensador de marcha", "electrico", "media", false, ["Condensador de marcha"], ["Medir µF"]),
          item("cableado_interno", "Cableado interno", "electrico", "alta", true, ["Cableado interno"], ["Ajustar y reconectar"]),
          item("limit_switch", "Limit switch de subida y bajada", "seguridad", "critica", true, ["Limit switch"], ["Probar corte superior e inferior"]),
          item("cable_botonera", "Cable de botonera", "electrico", "alta", true, ["Cable de botonera"], ["Revisar continuidad"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },

  tirfor: {
    tipo: "tirfor",
    nombre: "Tirfor",
    descripcion: "Checklist inteligente para equipo tipo Tirfor.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "inspeccion_primaria",
        titulo: "Inspección primaria",
        items: [
          item("gancho_tiro", "Gancho de tiro", "seguridad", "critica", true, ["Gancho de tiro"], ["Revisar seguro y deformación"]),
          item("cable_acero", "Cable de acero", "seguridad", "critica", true, ["Cable de acero"], ["Revisar hebras, diámetro y deformación"]),
          item("palanca_traccion", "Palanca de tracción", "mecanico", "alta", true, ["Palanca de tracción"], ["Revisar accionamiento"]),
          item("palanca_reversa", "Palanca reversa", "mecanico", "alta", true, ["Palanca reversa"], ["Revisar accionamiento"]),
          item("palanca_embrague", "Palanca de embrague", "mecanico", "alta", true, ["Palanca de embrague"], ["Revisar accionamiento"]),
          item("carcasa", "Carcasa en general", "visual", "media", false, [], ["Revisar golpes y deformaciones"]),
          item("pasador_gancho", "Pasador de gancho fijo, cadena, cupilla y traba", "seguridad", "critica", true, ["Pasador / cupilla / traba"], ["Revisar fijaciones críticas"]),
          item("manilla_traslado", "Manilla de traslado", "visual", "baja", false, ["Manilla"], ["Revisar fijación"]),
          item("guia_entrada_cable", "Guía de entrada de cable de acero", "seguridad", "alta", true, ["Guía de entrada"], ["Revisar desgaste"]),
          item("tubo_palanca", "Tubo o palanca de funcionamiento", "mecanico", "alta", true, ["Tubo de palanca"], ["Revisar deformación"]),
          item("prueba_vacio", "Pruebas en vacío", "operatividad", "alta", true, [], ["Probar sin carga"]),
        ],
      },
      {
        id: "componentes_internos",
        titulo: "Componentes internos",
        items: [
          item("tapa_frontal", "Tapa frontal", "mecanico", "media", false, ["Tapa frontal"], ["Revisar ajuste"]),
          item("tapa_trasera", "Tapa trasera", "mecanico", "media", false, ["Tapa trasera"], ["Revisar ajuste"]),
          item("varilla_conectora_larga", "Varilla conectora larga", "mecanico", "alta", true, ["Varilla conectora larga"], ["Revisar deformación"]),
          item("mandibula_superior", "Mandíbula superior", "seguridad", "critica", true, ["Mandíbula superior"], ["Revisar agarre y desgaste"]),
          item("varilla_conectora", "Varilla conectora", "mecanico", "alta", true, ["Varilla conectora"], ["Revisar desgaste"]),
          item("clavijas", "Clavijas internas", "seguridad", "alta", true, ["Clavijas"], ["Revisar desgaste y fijación"]),
          item("guia_cable_interno", "Guía de cable interno", "seguridad", "alta", true, ["Guía de cable interno"], ["Revisar desgaste"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },

  minifor: {
    tipo: "minifor",
    nombre: "Minifor",
    descripcion: "Checklist inteligente para Minifor.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "ingreso",
        titulo: "Ingreso",
        items: [
          item("gancho_superior", "Gancho superior", "seguridad", "critica", true, ["Gancho superior"], ["Revisar seguro y deformación"]),
          item("gancho_inferior", "Gancho inferior", "seguridad", "critica", true, ["Gancho inferior"], ["Revisar seguro y deformación"]),
          item("cable_acero", "Cable de acero", "seguridad", "critica", true, ["Cable de acero"], ["Revisar diámetro, hebras y deformación"]),
          item("radio_control", "Radio control", "electrico", "alta", true, ["Radio control"], ["Probar todos los movimientos"]),
          item("botonera_colgante", "Botonera colgante", "electrico", "alta", true, ["Botonera"], ["Probar comandos"]),
          item("carcasa", "Carcasa en general", "visual", "media", false, [], ["Revisar golpes y deformaciones"]),
          item("limpieza", "Limpieza general", "visual", "baja", false, [], ["Realizar limpieza técnica"]),
          item("cable_alimentacion", "Cable de alimentación", "electrico", "alta", true, ["Cable de alimentación"], ["Revisar aislación y continuidad"]),
          item("enchufe_alimentador", "Enchufe alimentador", "electrico", "alta", true, ["Enchufe"], ["Revisar conexión y estado"]),
          item("prueba_vacio", "Pruebas en vacío", "operatividad", "alta", true, [], ["Probar sin carga"]),
        ],
      },
      {
        id: "componentes",
        titulo: "Inspección de componentes",
        items: [
          item("bobinado_motor", "Bobinado del motor", "electrico", "alta", false, ["Motor / bobinado"], ["Medir bobinas"]),
          item("freno_magnetico", "Freno magnético", "seguridad", "critica", true, ["Freno magnético"], ["Revisar accionamiento"]),
          item("aceite_reductora", "Aceite de caja reductora", "mecanico", "alta", false, ["Aceite caja reductora"], ["Revisar nivel y contaminación"]),
          item("resorte_limitador_subida", "Resorte actuador limitador de subida", "seguridad", "alta", true, ["Resorte limitador subida"], ["Revisar tensión"]),
          item("resorte_limitador_bajada", "Resorte actuador limitador de bajada", "seguridad", "alta", true, ["Resorte limitador bajada"], ["Revisar tensión"]),
          item("cableado_interno", "Cableado interno", "electrico", "alta", true, ["Cableado interno"], ["Ajustar y reconectar"]),
          item("limit_switch", "Limit switch de subida y bajada", "seguridad", "critica", true, ["Limit switch"], ["Probar corte superior e inferior"]),
          item("cable_botonera", "Cable de botonera", "electrico", "alta", true, ["Cable de botonera"], ["Revisar continuidad"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },

  transpaleta_electrica: {
    tipo: "transpaleta_electrica",
    nombre: "Transpaleta eléctrica",
    descripcion: "Checklist inteligente para transpaleta eléctrica.",
    requiereMarca: true,
    requiereModelo: true,
    requiereSerie: true,
    requiereCapacidad: true,
    sections: [
      {
        id: "inspeccion_general",
        titulo: "Inspección general",
        items: [
          item("etiquetas", "Etiquetas faltantes o no legibles", "visual", "baja", false, ["Etiquetas"], ["Reponer etiquetas"]),
          item("avanza_retrocede", "Avanza y retrocede correctamente", "traccion", "alta", true, [], ["Probar tracción"]),
          item("velocidad_movimientos", "Velocidad de movimientos normal", "operatividad", "media", false, [], ["Probar velocidad"]),
          item("malfuncionamiento_electrico", "Mal funcionamiento eléctrico", "electrico", "alta", true, ["Controlador / cableado"], ["Revisar sistema eléctrico"]),
          item("cables_electricos", "Cables eléctricos", "electrico", "alta", true, ["Cables eléctricos"], ["Revisar aislación y continuidad"]),
          item("reloj_indicador", "Reloj indicador", "electrico", "media", false, ["Reloj indicador"], ["Revisar funcionamiento"]),
          item("switch_ignicion", "Switch de ignición", "electrico", "alta", true, ["Switch de ignición"], ["Revisar contacto"]),
          item("parada_emergencia", "Parada de emergencia", "seguridad", "critica", true, ["Parada de emergencia"], ["Probar corte"]),
          item("botones_volante", "Botones en volante de mando", "electrico", "alta", true, ["Botonera volante"], ["Probar comandos"]),
          item("switch_bobina", "Switch de bobina principal", "electrico", "alta", true, ["Switch bobina"], ["Revisar activación"]),
          item("bateria", "Batería", "electrico", "alta", false, ["Batería"], ["Medir voltaje de trabajo y voltaje actual"]),
        ],
      },
      {
        id: "hidraulica_y_mecanica",
        titulo: "Hidráulica, ruedas y estructura",
        items: [
          item("ruido_carga", "Sonido anormal bajo carga nominal", "operatividad", "alta", true, [], ["Probar bajo carga"]),
          item("sistema_subida_bajada", "Sistema de subida o bajada", "hidraulico", "alta", true, ["Bomba / cilindro / válvula"], ["Revisar funcionamiento hidráulico"]),
          item("contaminacion", "Contaminación anormal", "visual", "media", false, [], ["Limpiar tierra, óxido o grasa"]),
          item("danio_exterior", "Daño exterior en equipo o controles", "visual", "media", false, [], ["Revisar estructura y controles"]),
          item("perdida_aceite", "Pérdida de aceite hidráulico", "hidraulico", "alta", true, ["Sellos / mangueras / aceite"], ["Detectar fuga y reparar"]),
          item("freno_motor", "Freno magnético del motor", "seguridad", "critica", true, ["Freno magnético"], ["Probar frenado"]),
          item("tornillos", "Tornillos faltantes", "mecanico", "media", true, ["Tornillos"], ["Reponer y ajustar"]),
          item("pintura", "Pintura general", "visual", "baja", false, [], ["Evaluar pintura"]),
          item("rueda_traccion", "Rueda de tracción y rodamientos", "traccion", "alta", true, ["Rueda de tracción / rodamientos"], ["Revisar desgaste"]),
          item("ruedas_soporte", "Ruedas de soporte de paletas y rodamientos", "traccion", "alta", true, ["Ruedas soporte / rodamientos"], ["Revisar desgaste"]),
          item("ruedas_apoyo", "Ruedas de apoyo de tracción y rodamientos", "traccion", "alta", true, ["Ruedas apoyo / rodamientos"], ["Revisar desgaste"]),
          item("danio_visible", "Daño visible, deformación o condición anormal", "visual", "alta", true, [], ["Revisar estructura"]),
          item("ruido_operacion", "Ruido anormal al operar", "operatividad", "alta", true, [], ["Identificar origen del ruido"]),
        ],
      },
    ],
  },
};

export const TIPOS_EQUIPO_CHECKLIST = Object.values(CHECKLISTS).map((checklist) => ({
  value: checklist.tipo,
  label: checklist.nombre,
}));

export function getChecklistByTipo(tipo: string | null | undefined): ChecklistEquipo | null {
  if (!tipo) return null;
  return CHECKLISTS[tipo as TipoEquipoChecklist] ?? null;
}

export function getChecklistItems(tipo: TipoEquipoChecklist): ChecklistItem[] {
  return CHECKLISTS[tipo].sections.flatMap((section) => section.items);
}

export function getChecklistItemById(
  tipo: TipoEquipoChecklist,
  itemId: string
): ChecklistItem | null {
  return getChecklistItems(tipo).find((item) => item.id === itemId) ?? null;
}

export function getItemsCriticos(tipo: TipoEquipoChecklist): ChecklistItem[] {
  return getChecklistItems(tipo).filter(
    (item) => item.criticidad === "critica" || item.afectaSeguridad
  );
}