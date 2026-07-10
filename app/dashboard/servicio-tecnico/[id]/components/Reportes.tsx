"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { obtenerEquipoTrabajo } from "../lib/equipoTrabajoStore";

type ReporteFoto = {
  id: string;
  foto_url: string;
  storage_path: string | null;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type ReporteDocumento = {
  id: string;
  nombre: string | null;
  url: string | null;
};

type Reporte = {
  id: string;
  etapa: string;
  tecnico?: string | null;
  descripcion: string | null;
  hallazgos: string | null;
  acciones: string | null;
  costo: number | null;
  created_at: string;
  reporte_fotos?: ReporteFoto[];
  reporte_documentos?: ReporteDocumento[];
};

type Props = {
  ordenId: string;
  reportes: Reporte[];
  eliminandoFotoId: string | null;
  onOpenFoto: (url: string) => void;
  onEliminarFoto: (foto: ReporteFoto) => void;
};

type OrdenInfo = {
  id: string;
  codigo?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  capacidad?: string | null;
  created_at?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  problema_reportado?: string | null;
  problema?: string | null;
  observaciones?: string | null;
  observacion?: string | null;
  fotos_estado_inicial?: string | string[] | null;
};

type EquipoOT = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  capacidad?: string | null;
  estado?: string | null;
};

type DiagnosticoDb = {
  hallazgos?: string | null;
  procedimiento?: string | null;
  repuestos?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RevisionDb = {
  aprobado?: boolean | null;
  motivo?: string | null;
  horas_hombre?: number | null;
  procedimiento_aprobado?: string | null;
  repuestos_aprobados?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type CotizacionInternaDb = {
  items?: Array<{
    id?: string;
    equipoId?: string;
    tipo?: string;
    descripcion?: string;
    cantidad?: number;
    unitario?: number;
  }> | null;
  incluir_iva?: boolean | null;
  total_neto?: number | null;
  iva?: number | null;
  total_final?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};


type ChecklistFotoDb = {
  id: string;
  orden_id: string;
  item_id: string | null;
  item_label: string | null;
  nombre: string | null;
  url: string;
  storage_path: string | null;
  observacion: string | null;
  created_at?: string | null;
};

type ChecklistTecnicoDb = {
  orden_id: string;
  observaciones_generales?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type TrabajoStore = {
  cotizacion_estado?: "pendiente" | "aprobada" | "rechazada";
  cotizacion_aprobada?: boolean | null;
  observacion_cotizacion?: string;
  trabajo_realizado?: string;
  repuestos_cambiados?: boolean;
  reparaciones_realizadas?: boolean;
  ajustes_realizados?: boolean;
  mantencion_limpieza_realizada?: boolean;
  prueba_funcional?: boolean;
  prueba_carga?: boolean;
  equipo_limpio_entrega?: boolean;
  equipo_liberado?: boolean;
  horas_reales?: string;
  observaciones?: string;
  resultado_final?: string;
  fotos_egreso?: Array<{
    id: string;
    nombre: string;
    url: string;
  }>;
  documentos?: Array<{
    id: string;
    tipo: string;
    nombre: string;
    comentario: string;
    url: string;
  }>;
};

type EquipoResumen = {
  equipo: EquipoOT;
  diagnostico: DiagnosticoDb | null;
  revision: RevisionDb | null;
  trabajo: TrabajoStore;
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL");
  } catch {
    return "-";
  }
}

function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return "-";
  }
}

function formatMoneda(valor?: number | null) {
  if (valor == null) return "-";

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function textoSeguro(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}


function normalizarFotosIngreso(fotos?: string | string[] | null) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) {
    return fotos.filter(Boolean).map((url, index) => ({
      id: `ingreso-${index}`,
      url,
      nombre: `Foto de ingreso ${index + 1}`,
      comentario: "Foto de ingreso",
    }));
  }

  if (typeof fotos === "string") {
    try {
      const parsed = JSON.parse(fotos);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((url, index) => ({
          id: `ingreso-${index}`,
          url: String(url),
          nombre: `Foto de ingreso ${index + 1}`,
          comentario: "Foto de ingreso",
        }));
      }
    } catch {
      return fotos
        .split(",")
        .map((foto) => foto.trim())
        .filter(Boolean)
        .map((url, index) => ({
          id: `ingreso-${index}`,
          url,
          nombre: `Foto de ingreso ${index + 1}`,
          comentario: "Foto de ingreso",
        }));
    }
  }

  return [];
}

function sanitizarTexto(valor: unknown) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lineas(texto?: string | null) {
  return textoSeguro(texto)
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

function etapaLower(reporte: Reporte) {
  return textoSeguro(reporte.etapa).toLowerCase();
}

function reportesPorEtapa(reportes: Reporte[], palabras: string[]) {
  return reportes.filter((reporte) => {
    const etapa = etapaLower(reporte);

    return palabras.some((palabra) => etapa.includes(palabra));
  });
}

function fotosDeReportes(reportes: Reporte[]) {
  return reportes.flatMap((reporte) => reporte.reporte_fotos || []);
}

function documentosDeReportes(reportes: Reporte[]) {
  return reportes.flatMap((reporte) => reporte.reporte_documentos || []);
}

function estadoCotizacionTexto(trabajo: TrabajoStore) {
  if (trabajo.cotizacion_estado === "aprobada" || trabajo.cotizacion_aprobada === true) {
    return "Cotización aprobada";
  }

  if (trabajo.cotizacion_estado === "rechazada" || trabajo.cotizacion_aprobada === false) {
    return "Cotización rechazada";
  }

  return "Pendiente de aprobación";
}

function resultadoFinalTexto(resultado?: string) {
  if (resultado === "listo_entrega") return "Listo para entrega/despacho";
  if (resultado === "pendiente_repuesto") return "Pendiente por repuesto";
  if (resultado === "pendiente_validacion") return "Pendiente por validación";
  if (resultado === "no_reparable") return "No reparable";
  return "Pendiente";
}

function resumenTrabajo(trabajo: TrabajoStore) {
  const items: string[] = [];

  if (trabajo.repuestos_cambiados) items.push("Repuestos cambiados / instalados");
  if (trabajo.reparaciones_realizadas) items.push("Reparaciones realizadas");
  if (trabajo.ajustes_realizados) items.push("Ajustes realizados");
  if (trabajo.mantencion_limpieza_realizada) {
    items.push("Mantención / limpieza realizada");
  }
  if (trabajo.prueba_funcional) items.push("Prueba funcional realizada OK");
  if (trabajo.prueba_carga) items.push("Prueba de carga realizada OK");
  if (trabajo.equipo_limpio_entrega || trabajo.equipo_liberado) {
    items.push("Equipo limpio y listo para entrega/despacho");
  }

  if (!items.length) return "Sin cierre operativo registrado.";

  return items.join("\n");
}

function estadoFinalBadge(equiposResumen: EquipoResumen[], ordenInfo: OrdenInfo | null) {
  const algunoRechazado = equiposResumen.some((registro) => {
    const trabajo = registro.trabajo;
    return trabajo.cotizacion_estado === "rechazada" || trabajo.cotizacion_aprobada === false;
  });

  if (algunoRechazado || ordenInfo?.estado === "cerrado") {
    return {
      texto: "Servicio cerrado",
      clase: "cerrado",
    };
  }

  const todosListos =
    equiposResumen.length > 0 &&
    equiposResumen.every((registro) => {
      const trabajo = registro.trabajo;
      return (
        trabajo.resultado_final === "listo_entrega" ||
        trabajo.equipo_liberado === true ||
        registro.equipo.estado === "listo" ||
        registro.equipo.estado === "entregado"
      );
    });

  if (todosListos || ordenInfo?.estado === "listo" || ordenInfo?.estado === "entregado") {
    return {
      texto: "Listo para entrega/despacho",
      clase: "listo",
    };
  }

  return {
    texto: "En proceso",
    clase: "proceso",
  };
}

function equipoTitulo(equipo: EquipoOT, index: number) {
  return `Equipo ${index + 1} · ${equipo.equipo || "Sin tipo"}`;
}

function equipoIdentificador(equipo: EquipoOT) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function htmlListaDesdeLineas(texto?: string | null) {
  const registros = lineas(texto);

  if (!registros.length) return "<p>No registrado.</p>";

  return `<ul>${registros
    .map((registro) => `<li>${sanitizarTexto(registro)}</li>`)
    .join("")}</ul>`;
}

function htmlFotos(
  fotos: Array<{ id: string; url: string; nombre?: string | null; comentario?: string | null }>,
) {
  if (!fotos.length) return "<p>No se registraron fotos en esta etapa.</p>";

  return `
    <div class="fotos-grid">
      ${fotos
        .map(
          (foto) => `
            <a href="${sanitizarTexto(foto.url)}" target="_blank" class="foto-link">
              <img src="${sanitizarTexto(foto.url)}" alt="${sanitizarTexto(
                foto.nombre || "Foto de proceso",
              )}" />
              <span>${sanitizarTexto(foto.comentario || foto.nombre || "Abrir foto")}</span>
            </a>
          `,
        )
        .join("")}
    </div>
  `;
}

function htmlDocumentos(
  documentos: Array<{ id: string; url?: string | null; nombre?: string | null; tipo?: string | null; comentario?: string | null }>,
) {
  if (!documentos.length) return "<p>No se registraron documentos en esta etapa.</p>";

  return `
    <div class="documentos-lista">
      ${documentos
        .map((doc) => {
          const nombre = doc.nombre || doc.tipo || "Documento";
          const comentario = doc.comentario ? ` · ${doc.comentario}` : "";

          if (!doc.url) {
            return `<div class="documento">${sanitizarTexto(nombre + comentario)}</div>`;
          }

          return `
            <a href="${sanitizarTexto(doc.url)}" target="_blank" class="documento">
              ${sanitizarTexto(nombre + comentario)}
            </a>
          `;
        })
        .join("")}
    </div>
  `;
}

export default function Reportes({
  ordenId,
  reportes,
  eliminandoFotoId,
  onOpenFoto,
  onEliminarFoto,
}: Props) {
  const [ordenInfo, setOrdenInfo] = useState<OrdenInfo | null>(null);
  const [equiposResumen, setEquiposResumen] = useState<EquipoResumen[]>([]);
  const [cotizacionInterna, setCotizacionInterna] =
    useState<CotizacionInternaDb | null>(null);
  const [checklistFotos, setChecklistFotos] = useState<ChecklistFotoDb[]>([]);
  const [checklistsTecnicos, setChecklistsTecnicos] = useState<ChecklistTecnicoDb[]>([]);
  const [loading, setLoading] = useState(false);

  const reportesIngreso = useMemo(
    () => reportesPorEtapa(reportes, ["ingreso", "recepción", "recepcion"]),
    [reportes],
  );

  const reportesDiagnostico = useMemo(
    () => reportesPorEtapa(reportes, ["diagnóstico", "diagnostico", "checklist"]),
    [reportes],
  );

  const reportesTrabajo = useMemo(
    () =>
      reportesPorEtapa(reportes, [
        "trabajo",
        "reparación",
        "reparacion",
        "mantención",
        "mantencion",
        "prueba",
        "listo",
        "entrega",
        "egreso",
      ]),
    [reportes],
  );

  useEffect(() => {
    cargarDatosFinales();
  }, [ordenId, reportes]);

  async function cargarDatosFinales() {
    if (!ordenId) return;

    setLoading(true);

    try {
      const { data: ordenBase } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenId)
        .maybeSingle();

      const orden = (ordenBase as OrdenInfo | null) || null;
      setOrdenInfo(orden);

      const { data: hijos } = await supabase
        .from("ordenes")
        .select("*")
        .eq("orden_padre_id", ordenId)
        .order("codigo", { ascending: true });

      let equiposBase: EquipoOT[] = (hijos as EquipoOT[]) || [];

      if (!equiposBase.length && orden) {
        equiposBase = [orden as EquipoOT];
      }

      const resumen: EquipoResumen[] = [];

      for (const equipo of equiposBase) {
        const { data: diagnosticoData } = await supabase
          .from("diagnosticos")
          .select("*")
          .eq("orden_id", equipo.id)
          .limit(1);

        const { data: revisionData } = await supabase
          .from("revisiones_jefe")
          .select("*")
          .eq("orden_id", equipo.id)
          .maybeSingle();

        const equipoTrabajo = obtenerEquipoTrabajo(equipo.id);
        const trabajo = (equipoTrabajo.trabajo || {}) as TrabajoStore;

        resumen.push({
          equipo,
          diagnostico: ((diagnosticoData || [])[0] as DiagnosticoDb) || null,
          revision: (revisionData as RevisionDb | null) || null,
          trabajo,
        });
      }

      setEquiposResumen(resumen);

      const idsEquipos = equiposBase.map((equipo) => equipo.id).filter(Boolean);

      if (idsEquipos.length > 0) {
        const { data: checklistFotosData, error: errorChecklistFotos } = await supabase
          .from("checklist_fotos")
          .select("*")
          .in("orden_id", idsEquipos)
          .order("created_at", { ascending: true });

        if (errorChecklistFotos) {
          console.warn("No se pudieron cargar fotos de checklist:", errorChecklistFotos);
          setChecklistFotos([]);
        } else {
          setChecklistFotos((checklistFotosData || []) as ChecklistFotoDb[]);
        }

        const { data: checklistsData, error: errorChecklists } = await supabase
          .from("checklists_tecnicos")
          .select("orden_id, observaciones_generales, updated_at, created_at")
          .in("orden_id", idsEquipos);

        if (errorChecklists) {
          console.warn("No se pudieron cargar observaciones generales de checklist:", errorChecklists);
          setChecklistsTecnicos([]);
        } else {
          setChecklistsTecnicos((checklistsData || []) as ChecklistTecnicoDb[]);
        }
      } else {
        setChecklistFotos([]);
        setChecklistsTecnicos([]);
      }

      try {
        const { data: cotizacionData } = await supabase
          .from("cotizaciones_internas")
          .select("*")
          .eq("orden_id", ordenId)
          .maybeSingle();

        setCotizacionInterna((cotizacionData as CotizacionInternaDb | null) || null);
      } catch (error) {
        console.warn("No se pudo cargar cotización interna para reporte final:", error);
        setCotizacionInterna(null);
      }
    } catch (error) {
      console.error("Error cargando reporte final OT:", error);
    } finally {
      setLoading(false);
    }
  }

  function imprimirReporteFinal() {
    const estado = estadoFinalBadge(equiposResumen, ordenInfo);

    const fotosIngreso = [
      ...normalizarFotosIngreso(ordenInfo?.fotos_estado_inicial),
      ...fotosDeReportes(reportesIngreso).map((foto) => ({
        id: foto.id,
        url: foto.foto_url,
        nombre: "Foto de ingreso",
        comentario: foto.comentario,
      })),
    ];

    const docsIngreso = documentosDeReportes(reportesIngreso).map((doc) => ({
      id: doc.id,
      url: doc.url,
      nombre: doc.nombre || "Documento de ingreso",
    }));

    const fotosDiagnostico = [
      ...checklistFotos.map((foto) => ({
        id: foto.id,
        url: foto.url,
        nombre: foto.item_label || foto.nombre || "Foto checklist",
        comentario: foto.observacion || foto.item_label || "Foto checklist",
      })),
      ...fotosDeReportes(reportesDiagnostico).map((foto) => ({
        id: foto.id,
        url: foto.foto_url,
        nombre: "Foto de diagnóstico",
        comentario: foto.comentario,
      })),
    ];

    const docsDiagnostico = documentosDeReportes(reportesDiagnostico).map((doc) => ({
      id: doc.id,
      url: doc.url,
      nombre: doc.nombre || "Documento de diagnóstico",
    }));

    const fotosTrabajoReportes = fotosDeReportes(reportesTrabajo).map((foto) => ({
      id: foto.id,
      url: foto.foto_url,
      nombre: "Foto de trabajo",
      comentario: foto.comentario,
    }));

    const docsTrabajoReportes = documentosDeReportes(reportesTrabajo).map((doc) => ({
      id: doc.id,
      url: doc.url,
      nombre: doc.nombre || "Documento de trabajo",
    }));

    const fotosTrabajoStore = equiposResumen.flatMap((registro) =>
      (registro.trabajo.fotos_egreso || []).map((foto) => ({
        id: foto.id,
        url: foto.url,
        nombre: foto.nombre || "Foto de egreso",
      })),
    );

    const docsTrabajoStore = equiposResumen.flatMap((registro) =>
      (registro.trabajo.documentos || []).map((documento) => ({
        id: documento.id,
        url: documento.url,
        nombre: documento.nombre || documento.tipo || "Documento de trabajo",
        tipo: documento.tipo,
        comentario: documento.comentario,
      })),
    );

    const equiposHtml = equiposResumen
      .map((registro, index) => {
        const { equipo, diagnostico, revision, trabajo } = registro;

        return `
          <section class="equipo-card">
            <div class="equipo-title">
              <div>
                <span class="eyebrow">${sanitizarTexto(equipoIdentificador(equipo))}</span>
                <h2>${sanitizarTexto(equipoTitulo(equipo, index))}</h2>
              </div>
              <span class="estado-equipo">${sanitizarTexto(resultadoFinalTexto(trabajo.resultado_final))}</span>
            </div>

            <div class="equipo-grid">
              <div>
                <span class="label">Marca</span>
                <strong>${sanitizarTexto(equipo.marca || "-")}</strong>
              </div>
              <div>
                <span class="label">Modelo</span>
                <strong>${sanitizarTexto(equipo.modelo || "-")}</strong>
              </div>
              <div>
                <span class="label">Serie</span>
                <strong>${sanitizarTexto(equipo.numero_serie || "-")}</strong>
              </div>
              <div>
                <span class="label">Capacidad</span>
                <strong>${sanitizarTexto(equipo.capacidad || "-")}</strong>
              </div>
            </div>

            <div class="timeline-block">
              <h3>Observaciones generales de checklist</h3>
              <p>${sanitizarTexto(
                checklistsTecnicos.find((checklist) => checklist.orden_id === equipo.id)
                  ?.observaciones_generales || "Sin observaciones generales registradas.",
              )}</p>
            </div>

            <div class="timeline-block">
              <h3>Diagnóstico técnico</h3>
              <p>${sanitizarTexto(diagnostico?.hallazgos || "Sin hallazgos registrados.")}</p>

              <div class="columns">
                <div>
                  <h4>Procedimiento recomendado</h4>
                  ${htmlListaDesdeLineas(diagnostico?.procedimiento)}
                </div>

                <div>
                  <h4>Repuestos solicitados</h4>
                  ${htmlListaDesdeLineas(diagnostico?.repuestos)}
                </div>
              </div>
            </div>

            <div class="timeline-block">
              <h3>Revisión jefe técnico</h3>
              <p><strong>Resultado:</strong> ${
                revision?.aprobado === true
                  ? "Diagnóstico aprobado"
                  : revision?.aprobado === false
                    ? "Diagnóstico rechazado"
                    : "Sin revisión registrada"
              }</p>
              <p><strong>Horas hombre aprobadas:</strong> ${sanitizarTexto(
                revision?.horas_hombre ?? "-",
              )}</p>
              <p><strong>Observación:</strong> ${sanitizarTexto(revision?.motivo || "-")}</p>
            </div>

            <div class="timeline-block">
              <h3>Respuesta de cotización y trabajo</h3>
              <p><strong>Estado cotización:</strong> ${sanitizarTexto(
                estadoCotizacionTexto(trabajo),
              )}</p>
              <p><strong>Observación cotización:</strong> ${sanitizarTexto(
                trabajo.observacion_cotizacion || "-",
              )}</p>
              <p><strong>Horas reales:</strong> ${sanitizarTexto(trabajo.horas_reales || "-")}</p>
              <p><strong>Resultado final:</strong> ${sanitizarTexto(
                resultadoFinalTexto(trabajo.resultado_final),
              )}</p>
              <h4>Trabajo realizado</h4>
              ${htmlListaDesdeLineas(resumenTrabajo(trabajo))}
              <p><strong>Observación final técnico:</strong> ${sanitizarTexto(
                trabajo.observaciones || "-",
              )}</p>
            </div>
          </section>
        `;
      })
      .join("");

    const cotizacionItems = cotizacionInterna?.items || [];

    const cotizacionHtml = cotizacionItems.length
      ? `
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descripción</th>
              <th class="right">Cant.</th>
              <th class="right">Valor unit.</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cotizacionItems
              .map((item) => {
                const total = Number(item.cantidad || 0) * Number(item.unitario || 0);

                return `
                  <tr>
                    <td>${sanitizarTexto(item.tipo || "-")}</td>
                    <td>${sanitizarTexto(item.descripcion || "-")}</td>
                    <td class="right">${sanitizarTexto(item.cantidad ?? "-")}</td>
                    <td class="right">${sanitizarTexto(formatMoneda(item.unitario || 0))}</td>
                    <td class="right strong">${sanitizarTexto(formatMoneda(total))}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>

        <div class="totals">
          <div>
            <span>Neto interno</span>
            <strong>${sanitizarTexto(formatMoneda(cotizacionInterna?.total_neto || 0))}</strong>
          </div>
          <div>
            <span>IVA</span>
            <strong>${sanitizarTexto(formatMoneda(cotizacionInterna?.iva || 0))}</strong>
          </div>
          <div>
            <span>Total interno</span>
            <strong>${sanitizarTexto(formatMoneda(cotizacionInterna?.total_final || 0))}</strong>
          </div>
        </div>
      `
      : "<p>No se encontró cotización interna guardada.</p>";

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Reporte Final OT ${sanitizarTexto(ordenInfo?.codigo || "")}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #eef2f7;
              color: #0f172a;
              font-family: Arial, sans-serif;
              font-size: 12px;
            }

            .printbar {
              position: sticky;
              top: 0;
              z-index: 10;
              background: #1d4ed8;
              color: white;
              padding: 10px;
              text-align: center;
              font-weight: 800;
            }

            .page {
              width: 794px;
              min-height: 1123px;
              margin: 24px auto;
              background: white;
              padding: 34px;
              box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 3px solid #1e3a8a;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }

            .logo {
              width: 230px;
              height: auto;
              display: block;
              object-fit: contain;
              margin-bottom: 12px;
            }

            h1 {
              margin: 0;
              color: #1e3a8a;
              font-size: 24px;
              letter-spacing: 0.07em;
              text-transform: uppercase;
            }

            h2 {
              margin: 2px 0 0;
              color: #1e3a8a;
              font-size: 18px;
            }

            h3 {
              margin: 0 0 8px;
              color: #1e3a8a;
              font-size: 15px;
            }

            h4 {
              margin: 8px 0 6px;
              color: #334155;
              font-size: 12px;
            }

            p {
              margin: 0 0 7px;
              line-height: 1.45;
            }

            ul {
              margin: 0;
              padding-left: 18px;
            }

            li {
              margin: 0 0 4px;
              line-height: 1.4;
            }

            .meta {
              text-align: right;
              min-width: 210px;
              line-height: 1.5;
              color: #334155;
            }

            .badge {
              display: inline-block;
              margin-bottom: 8px;
              padding: 6px 10px;
              border-radius: 999px;
              font-weight: 900;
              font-size: 10px;
              letter-spacing: 0.03em;
            }

            .badge.listo {
              background: #dcfce7;
              color: #166534;
            }

            .badge.cerrado {
              background: #fee2e2;
              color: #991b1b;
            }

            .badge.proceso {
              background: #dbeafe;
              color: #1d4ed8;
            }

            .info-grid,
            .equipo-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 18px 0;
            }

            .info-box,
            .equipo-grid > div {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 9px;
              background: #f8fafc;
              min-height: 48px;
            }

            .label,
            .eyebrow {
              display: block;
              color: #64748b;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 4px;
              letter-spacing: 0.05em;
            }

            .info-box strong,
            .equipo-grid strong {
              display: block;
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
            }

            .timeline {
              border-left: 3px solid #bfdbfe;
              padding-left: 15px;
              margin-top: 18px;
            }

            .timeline-step {
              position: relative;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 14px;
              margin-bottom: 14px;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .timeline-step:before {
              content: "";
              position: absolute;
              left: -23px;
              top: 18px;
              width: 12px;
              height: 12px;
              border-radius: 999px;
              background: #1d4ed8;
              border: 3px solid white;
              box-shadow: 0 0 0 1px #93c5fd;
            }

            .equipo-card {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 16px;
              margin-top: 16px;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .equipo-title {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              margin-bottom: 12px;
            }

            .estado-equipo {
              border-radius: 999px;
              background: #ecfeff;
              color: #155e75;
              padding: 7px 11px;
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .timeline-block {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px;
              margin-top: 12px;
              background: #f8fafc;
            }

            .columns {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 10px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              font-size: 11px;
            }

            th {
              background: #eff6ff;
              color: #1e3a8a;
              text-align: left;
              padding: 8px;
              font-size: 9px;
              text-transform: uppercase;
              border-bottom: 1px solid #bfdbfe;
            }

            td {
              padding: 8px;
              border-bottom: 1px solid #e2e8f0;
              vertical-align: top;
              line-height: 1.35;
            }

            .right {
              text-align: right;
              white-space: nowrap;
            }

            .strong {
              font-weight: 900;
            }

            .totals {
              width: 320px;
              margin-left: auto;
              margin-top: 14px;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              overflow: hidden;
            }

            .totals div {
              display: flex;
              justify-content: space-between;
              padding: 9px 12px;
              border-bottom: 1px solid #e2e8f0;
            }

            .totals div:last-child {
              border-bottom: 0;
              background: #0f172a;
              color: white;
              font-size: 14px;
              font-weight: 900;
            }

            .fotos-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-top: 8px;
            }

            .foto-link {
              display: block;
              text-decoration: none;
              color: #334155;
              font-size: 10px;
              font-weight: 800;
            }

            .foto-link img {
              width: 100%;
              height: 90px;
              object-fit: cover;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              display: block;
              margin-bottom: 4px;
            }

            .documentos-lista {
              display: grid;
              gap: 8px;
              margin-top: 8px;
            }

            .documento {
              display: block;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 9px 10px;
              background: white;
              color: #1d4ed8;
              text-decoration: none;
              font-weight: 800;
            }

            .firmas {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 70px;
              margin-top: 46px;
              text-align: center;
              color: #334155;
              font-weight: 800;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .firma {
              border-top: 1px solid #334155;
              padding-top: 8px;
            }

            .footer {
              margin-top: 28px;
              text-align: center;
              color: #64748b;
              font-size: 10px;
            }

            @media print {
              body {
                background: white;
              }

              .printbar {
                display: none;
              }

              .page {
                width: auto;
                min-height: auto;
                margin: 0;
                padding: 0;
                box-shadow: none;
              }

              a[href]:after {
                content: "";
              }
            }
          </style>
        </head>

        <body>
          <div class="printbar">Imprimir / Guardar Reporte Final OT</div>

          <main class="page">
            <div class="header">
              <div>
                <img class="logo" src="/logo-informe.png" alt="MJ Industrial" />
                <h1>Reporte Final OT</h1>
              </div>

              <div class="meta">
                <span class="badge ${sanitizarTexto(estado.clase)}">${sanitizarTexto(
                  estado.texto,
                )}</span>
                <div><strong>OT:</strong> ${sanitizarTexto(ordenInfo?.codigo || ordenId)}</div>
                <div><strong>Fecha ingreso:</strong> ${sanitizarTexto(
                  formatFechaCorta(ordenInfo?.created_at),
                )}</div>
                <div><strong>Fecha emisión:</strong> ${sanitizarTexto(formatFechaCorta(new Date().toISOString()))}</div>
              </div>
            </div>

            <section class="info-grid">
              <div class="info-box">
                <span class="label">Cliente</span>
                <strong>${sanitizarTexto(ordenInfo?.cliente || "-")}</strong>
              </div>

              <div class="info-box">
                <span class="label">Contacto</span>
                <strong>${sanitizarTexto(ordenInfo?.cliente_email || "-")}</strong>
              </div>

              <div class="info-box">
                <span class="label">Prioridad</span>
                <strong>${sanitizarTexto(ordenInfo?.prioridad || "-")}</strong>
              </div>

              <div class="info-box">
                <span class="label">Estado actual</span>
                <strong>${sanitizarTexto(ordenInfo?.estado || "-")}</strong>
              </div>
            </section>

            <section class="timeline">
              <article class="timeline-step">
                <h3>1. Ingreso del equipo</h3>
                <p><strong>Fecha:</strong> ${sanitizarTexto(formatFecha(ordenInfo?.created_at))}</p>
                <p><strong>Observación inicial:</strong> ${sanitizarTexto(
                  ordenInfo?.problema_reportado ||
                    ordenInfo?.problema ||
                    ordenInfo?.observaciones ||
                    ordenInfo?.observacion ||
                    "Sin observación inicial registrada.",
                )}</p>
                <h4>Fotos de ingreso</h4>
                ${htmlFotos(fotosIngreso)}
                <h4>Documentos de ingreso</h4>
                ${htmlDocumentos(docsIngreso)}
              </article>

              <article class="timeline-step">
                <h3>2. Diagnóstico técnico</h3>
                ${equiposHtml}
                <h4>Fotos de diagnóstico / checklist</h4>
                ${htmlFotos(fotosDiagnostico)}
                <h4>Documentos de diagnóstico</h4>
                ${htmlDocumentos(docsDiagnostico)}
              </article>

              <article class="timeline-step">
                <h3>3. Cotización</h3>
                <p><strong>Cotización interna:</strong> ${
                  cotizacionInterna ? "Generada" : "No registrada"
                }</p>
                <p><strong>Fecha:</strong> ${sanitizarTexto(
                  formatFecha(cotizacionInterna?.updated_at || cotizacionInterna?.created_at),
                )}</p>
                ${cotizacionHtml}
              </article>

              <article class="timeline-step">
                <h3>4. Evidencia de trabajo / egreso</h3>
                <h4>Fotos de trabajo y egreso</h4>
                ${htmlFotos([...fotosTrabajoReportes, ...fotosTrabajoStore])}

                <h4>Documentos asociados / certificados / pruebas</h4>
                ${htmlDocumentos([...docsTrabajoReportes, ...docsTrabajoStore])}
              </article>

              <article class="timeline-step">
                <h3>5. Estado final</h3>
                <p><strong>Resultado:</strong> ${sanitizarTexto(estado.texto)}</p>
                <p><strong>Fecha reporte:</strong> ${sanitizarTexto(formatFecha(new Date().toISOString()))}</p>
              </article>
            </section>

            <section class="firmas">
              <div class="firma">Servicio Técnico MJ Industrial</div>
              <div class="firma">Cliente / Responsable</div>
            </section>

            <div class="footer">
              MJ Industrial · www.mjindustrial.cl · Documento generado digitalmente
            </div>
          </main>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);

    const iframeDocument = iframe.contentWindow?.document;

    if (!iframeDocument || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      alert("No se pudo preparar el reporte final para imprimir.");
      return;
    }

    iframeDocument.open();
    iframeDocument.write(html);
    iframeDocument.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 30000);
  }

  const estado = estadoFinalBadge(equiposResumen, ordenInfo);
  const fotosIngreso = [
    ...normalizarFotosIngreso(ordenInfo?.fotos_estado_inicial).map((foto) => ({
      id: foto.id,
      foto_url: foto.url,
      storage_path: null,
      comentario: foto.comentario,
      orden: null,
      es_principal: null,
    } as ReporteFoto)),
    ...fotosDeReportes(reportesIngreso),
  ];
  const documentosIngreso = documentosDeReportes(reportesIngreso);
  const fotosDiagnostico = [
    ...checklistFotos.map((foto) => ({
      id: foto.id,
      foto_url: foto.url,
      storage_path: foto.storage_path,
      comentario: foto.observacion || foto.item_label || foto.nombre,
      orden: null,
      es_principal: null,
    } as ReporteFoto)),
    ...fotosDeReportes(reportesDiagnostico),
  ];
  const documentosDiagnostico = documentosDeReportes(reportesDiagnostico);
  const fotosTrabajoReportes = fotosDeReportes(reportesTrabajo);
  const documentosTrabajoReportes = documentosDeReportes(reportesTrabajo);
  const fotosTrabajoStore = equiposResumen.flatMap(
    (registro) => registro.trabajo.fotos_egreso || [],
  );
  const documentosTrabajoStore = equiposResumen.flatMap(
    (registro) => registro.trabajo.documentos || [],
  );

  return (
    <section className="card">
      <div className="header">
        <div>
          <h2>Reporte Final OT</h2>
          <p>
            Consolidado único con ingreso, diagnóstico, cotización, aprobación,
            trabajo realizado, fotos, documentos y certificados.
          </p>
        </div>

        <button type="button" onClick={imprimirReporteFinal} disabled={loading}>
          {loading ? "Cargando..." : "Imprimir / Guardar PDF"}
        </button>
      </div>

      <div className={`estado ${estado.clase}`}>{estado.texto}</div>

      <div className="timelineUi">
        <article>
          <span>1</span>
          <div>
            <h3>Ingreso</h3>
            <p>
              Fecha: {formatFecha(ordenInfo?.created_at)} · Cliente:{" "}
              {ordenInfo?.cliente || "-"}
            </p>
            <small>
              Fotos: {fotosIngreso.length} · Documentos:{" "}
              {documentosIngreso.length}
            </small>
          </div>
        </article>

        <article>
          <span>2</span>
          <div>
            <h3>Diagnóstico técnico</h3>
            <p>
              {equiposResumen.length} equipo(s) con diagnóstico técnico y
              revisión jefe.
            </p>
            <small>
              Fotos diagnóstico: {fotosDiagnostico.length} · Documentos:{" "}
              {documentosDiagnostico.length}
            </small>
          </div>
        </article>

        <article>
          <span>3</span>
          <div>
            <h3>Cotización</h3>
            <p>
              {cotizacionInterna
                ? `Cotización interna generada por ${formatMoneda(
                    cotizacionInterna.total_final || 0,
                  )}`
                : "Cotización interna no registrada."}
            </p>
          </div>
        </article>

        <article>
          <span>4</span>
          <div>
            <h3>Aprobación / rechazo</h3>
            <p>
              {equiposResumen
                .map((registro) => estadoCotizacionTexto(registro.trabajo))
                .join(" · ") || "Sin respuesta de cliente registrada."}
            </p>
          </div>
        </article>

        <article>
          <span>5</span>
          <div>
            <h3>Trabajo realizado</h3>
            <p>
              Fotos egreso: {fotosTrabajoReportes.length + fotosTrabajoStore.length} ·
              Documentos / certificados:{" "}
              {documentosTrabajoReportes.length + documentosTrabajoStore.length}
            </p>
          </div>
        </article>
      </div>

      <div className="evidenciasPreview">
        <div>
          <h3>Fotos de ingreso</h3>
          <p>{fotosIngreso.length} foto(s) registradas.</p>
        </div>
        <div>
          <h3>Fotos checklist / diagnóstico</h3>
          <p>{fotosDiagnostico.length} foto(s) registradas.</p>
        </div>
        <div>
          <h3>Fotos trabajo / egreso</h3>
          <p>{fotosTrabajoReportes.length + fotosTrabajoStore.length} foto(s) registradas.</p>
        </div>
      </div>

      <div className="equipos">
        {equiposResumen.map((registro, index) => (
          <div key={registro.equipo.id} className="equipo">
            <div className="equipoHead">
              <div>
                <h3>{equipoTitulo(registro.equipo, index)}</h3>
                <p>{equipoIdentificador(registro.equipo)}</p>
              </div>

              <strong>{resultadoFinalTexto(registro.trabajo.resultado_final)}</strong>
            </div>

            <div className="grid">
              <div>
                <span>Diagnóstico</span>
                <p>{registro.diagnostico?.hallazgos || "Sin diagnóstico."}</p>
              </div>

              <div>
                <span>Trabajo final</span>
                <p className="pre">{resumenTrabajo(registro.trabajo)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!!reportes.length && (
        <details className="historico">
          <summary>Ver reportes históricos / evidencias cargadas</summary>

          <div className="listaHistorica">
            {reportes.map((reporte) => {
              const fotos = reporte.reporte_fotos || [];
              const documentos = reporte.reporte_documentos || [];

              return (
                <article key={reporte.id} className="reporteHistorico">
                  <div className="reporteHeader">
                    <strong>{reporte.etapa}</strong>
                    <span>{formatFecha(reporte.created_at)}</span>
                  </div>

                  {reporte.descripcion ? <p>{reporte.descripcion}</p> : null}
                  {reporte.hallazgos ? <p>{reporte.hallazgos}</p> : null}
                  {reporte.acciones ? <p>{reporte.acciones}</p> : null}

                  {!!documentos.length && (
                    <div className="documentos">
                      {documentos.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {doc.nombre || "Documento"}
                        </a>
                      ))}
                    </div>
                  )}

                  {!!fotos.length && (
                    <div className="fotos">
                      {fotos.map((foto) => (
                        <div key={foto.id} className="foto">
                          <img
                            src={foto.foto_url}
                            alt="foto reporte"
                            onClick={() => onOpenFoto(foto.foto_url)}
                          />

                          <button
                            type="button"
                            onClick={() => onEliminarFoto(foto)}
                            disabled={eliminandoFotoId === foto.id}
                          >
                            {eliminandoFotoId === foto.id ? "…" : "×"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </details>
      )}

      <style jsx>{`
        .card {
          background: white;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          margin-bottom: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        h2 {
          font-size: 20px;
          margin: 0;
          color: #0f172a;
        }

        h3 {
          margin: 0;
          color: #0f172a;
          font-size: 15px;
        }

        p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 13px;
          line-height: 1.45;
        }

        button {
          background: #2563eb;
          color: white;
          border: none;
          text-decoration: none;
          padding: 11px 16px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .estado {
          display: inline-flex;
          margin-bottom: 18px;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
        }

        .estado.listo {
          background: #dcfce7;
          color: #166534;
        }

        .estado.cerrado {
          background: #fee2e2;
          color: #991b1b;
        }

        .estado.proceso {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .timelineUi {
          display: grid;
          gap: 10px;
          margin-bottom: 18px;
        }

        .timelineUi article {
          display: flex;
          gap: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
          background: #f8fafc;
        }

        .timelineUi article > span {
          display: grid;
          place-items: center;
          flex: 0 0 30px;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: #2563eb;
          color: white;
          font-weight: 900;
        }

        small {
          display: block;
          margin-top: 5px;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .evidenciasPreview {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .evidenciasPreview > div {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 14px;
          padding: 14px;
        }

        .equipos {
          display: grid;
          gap: 12px;
        }

        .equipo {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px;
        }

        .equipoHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .equipoHead strong {
          border-radius: 999px;
          background: #ecfeff;
          color: #155e75;
          padding: 7px 10px;
          font-size: 11px;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .grid > div {
          border-radius: 12px;
          background: #f8fafc;
          padding: 12px;
          border: 1px solid #e2e8f0;
        }

        .grid span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .pre {
          white-space: pre-wrap;
        }

        .historico {
          margin-top: 16px;
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
        }

        .historico summary {
          cursor: pointer;
          color: #1d4ed8;
          font-weight: 900;
          font-size: 14px;
        }

        .listaHistorica {
          display: grid;
          gap: 12px;
          margin-top: 12px;
        }

        .reporteHistorico {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          background: #f8fafc;
        }

        .reporteHeader {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .documentos {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .documentos a {
          background: #dbeafe;
          color: #1d4ed8;
          text-decoration: none;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 900;
        }

        .fotos {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .foto {
          position: relative;
          width: 92px;
          height: 92px;
        }

        .foto img {
          width: 92px;
          height: 92px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          background: white;
        }

        .foto button {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.85);
          color: white;
          padding: 0;
          font-size: 12px;
        }

        @media (max-width: 800px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
