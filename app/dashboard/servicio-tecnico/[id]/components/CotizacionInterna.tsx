"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { obtenerEquipoTrabajo } from "../lib/equipoTrabajoStore";

type Props = {
  ordenId: string;
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

type OrdenInfo = {
  id: string;
  codigo?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  created_at?: string | null;
};

type TipoItem =
  | "repuesto"
  | "trabajo"
  | "reparacion"
  | "ajuste"
  | "mantencion"
  | "mano_obra"
  | "otro";

type ItemCotizacion = {
  id: string;
  equipoId: string;
  tipo: TipoItem;
  descripcion: string;
  cantidad: number;
  unitario: number;
};

type RevisionDb = {
  orden_id: string;
  aprobado?: boolean | null;
  horas_hombre?: number | null;
  procedimiento_aprobado?: string | null;
  repuestos_aprobados?: string | null;
};

type CotizacionInternaGuardada = {
  items?: ItemCotizacion[];
  incluirIva?: boolean;
  updated_at?: string;
};

function crearId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function identificadorEquipo(equipo: Equipo) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function formatearMoneda(valor: number) {
  return `$${Math.round(valor || 0).toLocaleString("es-CL")}`;
}

function etiquetaTipo(tipo: TipoItem) {
  if (tipo === "repuesto") return "Repuesto";
  if (tipo === "trabajo") return "Trabajo";
  if (tipo === "reparacion") return "Reparación";
  if (tipo === "ajuste") return "Ajuste";
  if (tipo === "mantencion") return "Mantención";
  if (tipo === "mano_obra") return "Mano de obra";
  return "Otro";
}

function normalizarTipo(accion: string): TipoItem {
  if (accion === "repuesto") return "repuesto";
  if (accion === "reparacion") return "reparacion";
  if (accion === "ajuste") return "ajuste";
  if (accion === "mantencion") return "mantencion";
  if (accion === "mantenimiento") return "mantencion";
  if (accion === "mano_obra") return "mano_obra";
  if (accion === "trabajo") return "trabajo";
  return "otro";
}

function parsearLineas(texto?: string | null) {
  if (!texto) return [];

  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

function parsearCantidadDescripcion(linea: string) {
  const limpia = linea.replace(/^[-•]\s*/, "").trim();
  const match = limpia.match(/^(\d+(?:[.,]\d+)?)\s*x\s*(.+)$/i);

  if (match) {
    return {
      cantidad: Number(match[1].replace(",", ".")) || 1,
      descripcion: match[2].trim(),
    };
  }

  return {
    cantidad: 1,
    descripcion: limpia,
  };
}

function limpiarDescripcionRepuesto(linea: string) {
  return linea
    .replace(/\|\s*Prioridad:.*$/i, "")
    .replace(/\|\s*Motivo:.*$/i, "")
    .trim();
}

function limpiarDescripcionTrabajo(linea: string) {
  return linea
    .replace(/^\d+\.\s*/, "")
    .replace(/^[-•]\s*/, "")
    .replace(/\|\s*Prioridad:.*$/i, "")
    .replace(/\|\s*Motivo:.*$/i, "")
    .trim();
}

function crearItemsDesdeChecklist(equipoId: string) {
  const trabajo = obtenerEquipoTrabajo(equipoId);
  const checklist = trabajo.checklist;

  if (!checklist?.itemsMalos?.length) return [];

  const items: ItemCotizacion[] = [];

  checklist.itemsMalos.forEach((registro: any) => {
    const item = registro.item || {};
    const respuesta = registro.respuesta || {};

    const nombreItem =
      item.nombre ||
      item.titulo ||
      item.label ||
      item.name ||
      item.id ||
      "Ítem observado";

    const acciones = respuesta.acciones || [];

    acciones.forEach((accion: string) => {
      const tipo = normalizarTipo(accion);

      items.push({
        id: crearId(),
        equipoId,
        tipo,
        descripcion:
          tipo === "repuesto"
            ? respuesta.repuesto_nombre || nombreItem
            : tipo === "otro"
              ? respuesta.accion_otro || nombreItem
              : nombreItem,
        cantidad:
          tipo === "repuesto"
            ? Number(respuesta.repuesto_cantidad || 1)
            : 1,
        unitario: 0,
      });
    });
  });

  return items;
}

function crearItemsDesdeRevisionTexto(
  equipoId: string,
  revision?: RevisionDb | null,
) {
  const items: ItemCotizacion[] = [];

  parsearLineas(revision?.repuestos_aprobados).forEach((linea) => {
    const parsed = parsearCantidadDescripcion(limpiarDescripcionRepuesto(linea));

    items.push({
      id: crearId(),
      equipoId,
      tipo: "repuesto",
      descripcion: parsed.descripcion,
      cantidad: parsed.cantidad,
      unitario: 0,
    });
  });

  parsearLineas(revision?.procedimiento_aprobado).forEach((linea) => {
    const texto = limpiarDescripcionTrabajo(linea);

    if (!texto) return;
    if (texto.toLowerCase().includes("repuestos sugeridos")) return;
    if (texto.toLowerCase().includes("repuestos aprobados")) return;
    if (texto.toLowerCase().includes("repuestos solicitados")) return;
    if (texto.toLowerCase().includes("acciones sugeridas")) return;
    if (texto.toLowerCase().includes("acciones aprobadas")) return;
    if (texto.toLowerCase().includes("acciones requeridas")) return;
    if (texto.toLowerCase().includes("se recomienda")) return;

    const lower = texto.toLowerCase();
    let tipo: TipoItem = "trabajo";
    let descripcion = texto;

    if (lower.startsWith("reparación -") || lower.startsWith("reparacion -")) {
      tipo = "reparacion";
      descripcion = texto.split("-").slice(1).join("-").trim() || texto;
    } else if (lower.startsWith("ajuste -")) {
      tipo = "ajuste";
      descripcion = texto.split("-").slice(1).join("-").trim() || texto;
    } else if (
      lower.startsWith("mantención -") ||
      lower.startsWith("mantencion -")
    ) {
      tipo = "mantencion";
      descripcion = texto.split("-").slice(1).join("-").trim() || texto;
    } else if (lower.includes("mantención") || lower.includes("mantencion")) {
      tipo = "mantencion";
    } else if (lower.includes("ajuste") || lower.includes("aseguramiento")) {
      tipo = "ajuste";
    } else if (lower.includes("reparación") || lower.includes("reparacion")) {
      tipo = "reparacion";
    } else if (lower.includes("reemplazo") || lower.includes("cambio")) {
      tipo = "trabajo";
    }

    items.push({
      id: crearId(),
      equipoId,
      tipo,
      descripcion,
      cantidad: 1,
      unitario: 0,
    });
  });

  return items;
}

function cargarCotizacionGuardadaLocal(ordenId: string) {
  try {
    const raw = localStorage.getItem(`cotizacion-interna-${ordenId}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CotizacionInternaGuardada;

    if (!Array.isArray(parsed.items)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function sanitizarTexto(valor: unknown) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fechaActualCL() {
  return new Date().toLocaleDateString("es-CL");
}

export default function CotizacionInterna({
  ordenId,
  onEstadoActualizado,
}: Props) {
  const [ordenInfo, setOrdenInfo] = useState<OrdenInfo | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!ordenId) return false;

    return !!localStorage.getItem(`cotizacion-interna-${ordenId}`);
  });
  const [incluirIva, setIncluirIva] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarCotizacionGuardadaSupabase() {
    if (!ordenId) return null;

    try {
      const { data, error } = await supabase
        .from("cotizaciones_internas")
        .select("items,incluir_iva,updated_at")
        .eq("orden_id", ordenId)
        .maybeSingle();

      if (error) {
        console.warn("No se pudo leer cotización interna desde Supabase:", error);
        return null;
      }

      if (!data || !Array.isArray(data.items)) return null;

      return {
        items: data.items as ItemCotizacion[],
        incluirIva: data.incluir_iva ?? true,
        updated_at: data.updated_at || undefined,
      };
    } catch (error) {
      console.warn("Tabla cotizaciones_internas no disponible todavía:", error);
      return null;
    }
  }

  async function cargarDatos() {
    if (!ordenId) {
      const equipoGeneral: Equipo = {
        id: "general",
        codigo: "General",
        equipo: "Cotización general",
      };

      setEquipos([equipoGeneral]);
      setItems([
        {
          id: crearId(),
          equipoId: "general",
          tipo: "otro",
          descripcion: "",
          cantidad: 1,
          unitario: 0,
        },
      ]);
      return;
    }

    setLoading(true);

    try {
      const { data: ordenBase } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenId)
        .maybeSingle();

      setOrdenInfo((ordenBase as OrdenInfo) || null);

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

      const guardadaSupabase = await cargarCotizacionGuardadaSupabase();

      if (guardadaSupabase?.items?.length) {
        setEquipos(equiposBase);
        setItems(guardadaSupabase.items);
        setIncluirIva(guardadaSupabase.incluirIva ?? true);
        setGuardadoOk(true);
        setLoading(false);
        return;
      }

      const guardadaLocal = cargarCotizacionGuardadaLocal(ordenId);
      if (guardadaLocal?.items?.length) {
        setEquipos(equiposBase);
        setItems(guardadaLocal.items);
        setIncluirIva(guardadaLocal.incluirIva ?? true);
        setGuardadoOk(true);
        setLoading(false);
        return;
      }

      const nuevosItems: ItemCotizacion[] = [];

      for (const equipo of equiposBase) {
        const trabajoEquipo = obtenerEquipoTrabajo(equipo.id);

        const { data: revisionDb } = await supabase
          .from("revisiones_jefe")
          .select(
            "orden_id,aprobado,horas_hombre,procedimiento_aprobado,repuestos_aprobados",
          )
          .eq("orden_id", equipo.id)
          .maybeSingle();

        const revision: RevisionDb | null = {
          orden_id: equipo.id,
          aprobado: revisionDb?.aprobado ?? trabajoEquipo.revision?.aprobado,
          horas_hombre:
            revisionDb?.horas_hombre ?? trabajoEquipo.revision?.horas_hombre,
          procedimiento_aprobado:
            revisionDb?.procedimiento_aprobado ??
            trabajoEquipo.revision?.procedimiento_aprobado,
          repuestos_aprobados:
            revisionDb?.repuestos_aprobados ??
            trabajoEquipo.revision?.repuestos_aprobados,
        };

        if (revision?.aprobado === false) {
          nuevosItems.push({
            id: crearId(),
            equipoId: equipo.id,
            tipo: "otro",
            descripcion: "Equipo rechazado en revisión técnica",
            cantidad: 1,
            unitario: 0,
          });
          continue;
        }

        const itemsChecklist = crearItemsDesdeChecklist(equipo.id);

        if (itemsChecklist.length > 0) {
          nuevosItems.push(...itemsChecklist);
        } else {
          nuevosItems.push(...crearItemsDesdeRevisionTexto(equipo.id, revision));
        }

        const horas =
          revision?.horas_hombre && Number(revision.horas_hombre) > 0
            ? Number(revision.horas_hombre)
            : 0;

        if (horas > 0) {
          nuevosItems.push({
            id: crearId(),
            equipoId: equipo.id,
            tipo: "mano_obra",
            descripcion: "Mano de obra servicio técnico",
            cantidad: horas,
            unitario: 0,
          });
        }

        const itemsEquipo = nuevosItems.filter(
          (item) => item.equipoId === equipo.id,
        );

        if (!itemsEquipo.length) {
          nuevosItems.push({
            id: crearId(),
            equipoId: equipo.id,
            tipo: "otro",
            descripcion: "",
            cantidad: 1,
            unitario: 0,
          });
        }
      }

      setEquipos(equiposBase);
      setItems(nuevosItems);
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : "No se pudo cargar la cotización interna";
      alert(mensaje);
    } finally {
      setLoading(false);
    }
  }

  function agregarItem(equipoId: string, tipo: TipoItem = "otro") {
    setItems((prev) => [
      ...prev,
      {
        id: crearId(),
        equipoId,
        tipo,
        descripcion: "",
        cantidad: 1,
        unitario: 0,
      },
    ]);
    setGuardadoOk(false);
  }

  function eliminarItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setGuardadoOk(false);
  }

  function actualizarItem(
    itemId: string,
    campo: keyof ItemCotizacion,
    valor: string | number,
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        if (campo === "cantidad" || campo === "unitario") {
          return {
            ...item,
            [campo]: Number(valor) || 0,
          };
        }

        return {
          ...item,
          [campo]: valor,
        };
      }),
    );
    setGuardadoOk(false);
  }

  const totalNeto = useMemo(() => {
    return items.reduce((total, item) => {
      return total + Number(item.cantidad || 0) * Number(item.unitario || 0);
    }, 0);
  }, [items]);

  const iva = incluirIva ? totalNeto * 0.19 : 0;
  const totalFinal = totalNeto + iva;

  function subtotalEquipo(equipoId: string) {
    return items
      .filter((item) => item.equipoId === equipoId)
      .reduce((total, item) => {
        return total + Number(item.cantidad || 0) * Number(item.unitario || 0);
      }, 0);
  }

  async function guardarLocal() {
    if (!ordenId) return;

    setGuardando(true);

    const payload = {
      ordenId,
      items,
      incluirIva,
      totalNeto,
      iva,
      totalFinal,
      updated_at: new Date().toISOString(),
    };

    localStorage.setItem(`cotizacion-interna-${ordenId}`, JSON.stringify(payload));

    try {
      const { error: errorCotizacion } = await supabase
        .from("cotizaciones_internas")
        .upsert(
          {
            orden_id: ordenId,
            items,
            incluir_iva: incluirIva,
            total_neto: totalNeto,
            iva,
            total_final: totalFinal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "orden_id" },
        );

      if (errorCotizacion) {
        console.warn(
          "No se pudo guardar en cotizaciones_internas. Se guardó localmente:",
          errorCotizacion,
        );
      }
    } catch (error) {
      console.warn(
        "Tabla cotizaciones_internas no disponible. Se guardó localmente:",
        error,
      );
    }

    const { error } = await supabase
      .from("ordenes")
      .update({ estado: "trabajo" })
      .eq("id", ordenId);

    await supabase
      .from("ordenes")
      .update({ estado: "trabajo" })
      .eq("orden_padre_id", ordenId);

    setGuardando(false);

    if (error) {
      alert("No se pudo actualizar la OT a Trabajo");
      return;
    }

    setGuardadoOk(true);
    onEstadoActualizado?.("trabajo");
  }

  function regenerarDesdeFlujo() {
    if (!ordenId) return;

    const confirmar = window.confirm(
      "Esto volverá a cargar la cotización desde la revisión aprobada y perderá cambios no guardados en esta pantalla. ¿Continuar?",
    );

    if (!confirmar) return;

    localStorage.removeItem(`cotizacion-interna-${ordenId}`);
    setGuardadoOk(false);
    cargarDatos();
  }

  function imprimirCotizacionInterna() {
    const equiposHtml = equipos
      .map((equipo, equipoIndex) => {
        const itemsEquipo = items.filter((item) => item.equipoId === equipo.id);
        const subtotal = subtotalEquipo(equipo.id);

        const filasEquipo = itemsEquipo
          .map((item) => {
            const totalItem =
              Number(item.cantidad || 0) * Number(item.unitario || 0);

            return `
              <tr>
                <td>${sanitizarTexto(etiquetaTipo(item.tipo))}</td>
                <td>${sanitizarTexto(item.descripcion)}</td>
                <td class="right">${sanitizarTexto(item.cantidad)}</td>
                <td class="right">${sanitizarTexto(formatearMoneda(item.unitario))}</td>
                <td class="right strong">${sanitizarTexto(formatearMoneda(totalItem))}</td>
              </tr>
            `;
          })
          .join("");

        return `
          <section class="equipo-card">
            <div class="equipo-title">
              <div>
                <span class="eyebrow">Equipo ${equipoIndex + 1}</span>
                <h2>${sanitizarTexto(equipo.equipo || "Equipo")}</h2>
              </div>
              <div class="subtotal-pill">
                <span>Subtotal equipo</span>
                <strong>${sanitizarTexto(formatearMoneda(subtotal))}</strong>
              </div>
            </div>

            <div class="equipo-grid">
              <div>
                <span class="label">Código / Serie</span>
                <strong>${sanitizarTexto(equipo.codigo || equipo.numero_serie || "-")}</strong>
              </div>
              <div>
                <span class="label">Marca</span>
                <strong>${sanitizarTexto(equipo.marca || "-")}</strong>
              </div>
              <div>
                <span class="label">Modelo</span>
                <strong>${sanitizarTexto(equipo.modelo || "-")}</strong>
              </div>
            </div>

            <div class="section-title">Ítems internos valorizados</div>

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
                ${
                  filasEquipo ||
                  `<tr><td colspan="5">Sin ítems internos registrados.</td></tr>`
                }
              </tbody>
            </table>
          </section>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cotización interna ${sanitizarTexto(ordenInfo?.codigo || "")}</title>
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
              align-items: flex-start;
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
              font-size: 25px;
              letter-spacing: 0.07em;
              text-transform: uppercase;
              line-height: 1.15;
            }

            h2 {
              margin: 2px 0 0;
              color: #1e3a8a;
              font-size: 18px;
              line-height: 1.15;
            }

            .meta {
              text-align: right;
              line-height: 1.5;
              color: #334155;
              min-width: 210px;
            }

            .badge {
              display: inline-block;
              margin-bottom: 8px;
              padding: 6px 10px;
              border-radius: 999px;
              background: #fef3c7;
              color: #92400e;
              font-weight: 900;
              font-size: 10px;
              letter-spacing: 0.03em;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 18px 0 20px;
            }

            .info-box,
            .equipo-grid > div {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 9px;
              background: #f8fafc;
              min-height: 48px;
            }

            .label {
              display: block;
              color: #64748b;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              margin-bottom: 4px;
              letter-spacing: 0.05em;
            }

            .value,
            .info-box strong,
            .equipo-grid strong {
              display: block;
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
            }

            .internal-note {
              margin: 0 0 18px;
              padding: 11px 12px;
              border-radius: 12px;
              background: #fff7ed;
              color: #9a3412;
              font-weight: 800;
              line-height: 1.45;
              border: 1px solid #fed7aa;
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

            .eyebrow {
              display: block;
              color: #64748b;
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              margin-bottom: 2px;
            }

            .subtotal-pill {
              min-width: 150px;
              border-radius: 999px;
              background: #ecfeff;
              color: #155e75;
              padding: 7px 11px;
              text-align: right;
              border: 1px solid #a5f3fc;
            }

            .subtotal-pill span {
              display: block;
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .subtotal-pill strong {
              display: block;
              font-size: 14px;
              font-weight: 900;
            }

            .equipo-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-bottom: 14px;
            }

            .section-title {
              margin: 10px 0 7px;
              color: #1e3a8a;
              font-weight: 900;
              font-size: 13px;
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

            tr:last-child td {
              border-bottom: 0;
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
              margin-top: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
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
          <div class="printbar">Imprimir / Guardar PDF</div>

          <main class="page">
            <div class="header">
              <div>
                <img class="logo" src="/logo-informe.png" alt="MJ Industrial" />
                <h1>Cotización interna</h1>
              </div>

              <div class="meta">
                <div class="badge">USO INTERNO MJ INDUSTRIAL</div>
                <div><strong>OT:</strong> ${sanitizarTexto(ordenInfo?.codigo || ordenId)}</div>
                <div><strong>Fecha:</strong> ${fechaActualCL()}</div>
                <div><strong>Estado:</strong> Base interna para vendedor</div>
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
                <span class="label">Fecha ingreso</span>
                <strong>${
                  ordenInfo?.created_at
                    ? sanitizarTexto(
                        new Date(ordenInfo.created_at).toLocaleDateString("es-CL"),
                      )
                    : "-"
                }</strong>
              </div>

              <div class="info-box">
                <span class="label">Total interno</span>
                <strong>${sanitizarTexto(formatearMoneda(totalFinal))}</strong>
              </div>
            </section>

            <div class="internal-note">
              Documento interno para el área comercial. No entregar directamente al cliente.
              El vendedor debe usar esta base para preparar la cotización comercial final.
            </div>

            ${equiposHtml}

            <section class="totals">
              <div>
                <span>Neto interno</span>
                <strong>${sanitizarTexto(formatearMoneda(totalNeto))}</strong>
              </div>

              <div>
                <span>IVA</span>
                <strong>${sanitizarTexto(formatearMoneda(iva))}</strong>
              </div>

              <div>
                <span>Total interno</span>
                <strong>${sanitizarTexto(formatearMoneda(totalFinal))}</strong>
              </div>
            </section>

            <section class="firmas">
              <div class="firma">Servicio Técnico MJ Industrial</div>
              <div class="firma">Vendedor / Responsable comercial</div>
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
      alert("No se pudo preparar la cotización interna para imprimir.");
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
  if (loading) {
    return (
      <section className="card">
        <p>Cargando cotización interna...</p>

        <style jsx>{`
          .card {
            background: white;
            padding: 20px;
            border-radius: 18px;
            border: 1px solid #e2e8f0;
            margin-bottom: 18px;
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="header">
        <div>
          <h2>Cotización Interna</h2>
          <p>
            Los ítems se cargan desde el checklist aprobado y se complementan
            con las horas hombre de revisión. Puedes editar cantidades, valores
            y agregar ítems manuales.
          </p>
        </div>

        <div className="headerActions">
          <button
            type="button"
            onClick={regenerarDesdeFlujo}
            className="secondaryTop"
          >
            Regenerar desde revisión
          </button>

          <button
            type="button"
            onClick={imprimirCotizacionInterna}
            className="secondaryTop"
          >
            Imprimir / Guardar PDF
          </button>

          <button
            type="button"
            onClick={guardarLocal}
            disabled={guardando}
            className={guardadoOk ? "guardado" : ""}
          >
            {guardando
              ? "Guardando..."
              : guardadoOk
                ? "✓ Cotización guardada"
                : "Guardar cotización"}
          </button>
        </div>
      </div>

      <div className="ivaBox">
        <label>
          <input
            type="checkbox"
            checked={incluirIva}
            onChange={(event) => {
              setIncluirIva(event.target.checked);
              setGuardadoOk(false);
            }}
          />
          Incluir IVA 19%
        </label>
      </div>

      <div className="equipos">
        {equipos.map((equipo, index) => {
          const itemsEquipo = items.filter(
            (item) => item.equipoId === equipo.id,
          );
          const subtotal = subtotalEquipo(equipo.id);

          return (
            <div key={equipo.id} className="equipoCard">
              <div className="equipoHeader">
                <div>
                  <h3>Equipo {index + 1}</h3>
                  <strong>{equipo.equipo || "Sin tipo"}</strong>
                  <span>{identificadorEquipo(equipo)}</span>

                  {(equipo.marca || equipo.modelo) && (
                    <small>
                      {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                    </small>
                  )}
                </div>

                <div className="subtotalEquipo">
                  <span>Subtotal equipo</span>
                  <strong>{formatearMoneda(subtotal)}</strong>
                </div>
              </div>

              <div className="tablaWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Descripción</th>
                      <th>Cant.</th>
                      <th>Valor unitario</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {itemsEquipo.map((item) => {
                      const totalItem =
                        Number(item.cantidad || 0) * Number(item.unitario || 0);

                      return (
                        <tr key={item.id}>
                          <td>
                            <select
                              value={item.tipo}
                              onChange={(event) =>
                                actualizarItem(
                                  item.id,
                                  "tipo",
                                  event.target.value as TipoItem,
                                )
                              }
                            >
                              <option value="repuesto">Repuesto</option>
                              <option value="trabajo">Trabajo</option>
                              <option value="reparacion">Reparación</option>
                              <option value="ajuste">Ajuste</option>
                              <option value="mantencion">Mantención</option>
                              <option value="mano_obra">Mano de obra</option>
                              <option value="otro">Otro</option>
                            </select>
                          </td>

                          <td>
                            <input
                              value={item.descripcion}
                              onChange={(event) =>
                                actualizarItem(
                                  item.id,
                                  "descripcion",
                                  event.target.value,
                                )
                              }
                              placeholder="Descripción del ítem"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={item.cantidad}
                              onChange={(event) =>
                                actualizarItem(
                                  item.id,
                                  "cantidad",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={item.unitario}
                              onChange={(event) =>
                                actualizarItem(
                                  item.id,
                                  "unitario",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td className="totalItem">
                            {formatearMoneda(totalItem)}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="delete"
                              onClick={() => eliminarItem(item.id)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="acciones">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => agregarItem(equipo.id, "repuesto")}
                >
                  + Repuesto
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => agregarItem(equipo.id, "reparacion")}
                >
                  + Reparación
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => agregarItem(equipo.id, "ajuste")}
                >
                  + Ajuste
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => agregarItem(equipo.id, "mantencion")}
                >
                  + Mantención
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => agregarItem(equipo.id, "mano_obra")}
                >
                  + Mano de obra
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => agregarItem(equipo.id, "otro")}
                >
                  + Otro
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="totales">
        <div>
          <span>Neto</span>
          <strong>{formatearMoneda(totalNeto)}</strong>
        </div>

        <div>
          <span>IVA</span>
          <strong>{formatearMoneda(iva)}</strong>
        </div>

        <div className="final">
          <span>Total interno</span>
          <strong>{formatearMoneda(totalFinal)}</strong>
        </div>
      </div>

      <style jsx>{`
        .card {
          background: white;
          padding: 20px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          margin-bottom: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .headerActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        h2 {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
        }

        p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.45;
        }

        button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 800;
          white-space: nowrap;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        button.guardado {
          background: #16a34a;
          color: white;
        }

        .secondaryTop {
          background: #e0f2fe;
          color: #0369a1;
        }

        .ivaBox {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 16px;
          color: #334155;
          font-size: 14px;
          font-weight: 800;
        }

        .ivaBox label {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .equipos {
          display: grid;
          gap: 18px;
        }

        .equipoCard {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
        }

        .equipoHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }

        h3 {
          margin: 0 0 4px;
          color: #0f172a;
          font-size: 18px;
        }

        strong {
          display: block;
          color: #334155;
          font-size: 14px;
        }

        span {
          display: block;
          color: #64748b;
          font-size: 13px;
          margin-top: 3px;
        }

        small {
          display: block;
          color: #94a3b8;
          margin-top: 3px;
          font-size: 12px;
        }

        .subtotalEquipo {
          text-align: right;
          min-width: 150px;
        }

        .subtotalEquipo span {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
        }

        .subtotalEquipo strong {
          margin-top: 4px;
          font-size: 20px;
          color: #0f172a;
        }

        .tablaWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }

        th {
          background: #f1f5f9;
          color: #334155;
          text-align: left;
          padding: 10px;
          font-size: 12px;
          text-transform: uppercase;
        }

        td {
          padding: 10px;
          border-top: 1px solid #e2e8f0;
          background: white;
        }

        input,
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          background: white;
        }

        .totalItem {
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
        }

        .delete {
          background: #fee2e2;
          color: #b91c1c;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 999px;
          font-size: 20px;
        }

        .acciones {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 12px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .secondary {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 12px;
        }

        .totales {
          margin-top: 22px;
          margin-left: auto;
          max-width: 360px;
          display: grid;
          gap: 10px;
        }

        .totales div {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .totales span {
          color: #64748b;
          font-weight: 800;
        }

        .totales strong {
          color: #0f172a;
          font-size: 18px;
        }

        .totales .final {
          border-bottom: none;
          background: #0f172a;
          color: white;
          padding: 14px;
          border-radius: 14px;
        }

        .totales .final span,
        .totales .final strong {
          color: white;
        }

        @media (max-width: 800px) {
          .header,
          .equipoHeader {
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .subtotalEquipo {
            text-align: left;
          }

          .totales {
            max-width: none;
          }
        }
      `}</style>
    </section>
  );
}
