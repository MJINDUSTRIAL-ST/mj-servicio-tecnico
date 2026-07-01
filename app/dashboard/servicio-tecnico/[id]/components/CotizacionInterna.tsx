"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Props = {
  ordenId?: string;
};

type Equipo = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type ItemCotizacion = {
  id: string;
  equipoId: string;
  tipo: "repuesto" | "trabajo" | "mano_obra" | "servicio" | "otro";
  descripcion: string;
  cantidad: number;
  unitario: number;
};

type RevisionData = {
  orden_id: string;
  horas_hombre?: number | null;
  procedimiento_aprobado?: string | null;
  repuestos_aprobados?: string | null;
};

function crearId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function identificadorEquipo(equipo: Equipo) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function parsearLineas(texto?: string | null) {
  if (!texto) return [];

  return texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
}

function parsearCantidadDescripcion(linea: string) {
  const limpia = linea.trim();

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

function crearItemsDesdeRevision(equipoId: string, revision?: RevisionData | null) {
  const items: ItemCotizacion[] = [];

  const repuestos = parsearLineas(revision?.repuestos_aprobados);

  repuestos.forEach((linea) => {
    const parsed = parsearCantidadDescripcion(linea);

    items.push({
      id: crearId(),
      equipoId,
      tipo: "repuesto",
      descripcion: parsed.descripcion,
      cantidad: parsed.cantidad,
      unitario: 0,
    });
  });

  const procedimiento = parsearLineas(revision?.procedimiento_aprobado);

  procedimiento.forEach((linea) => {
    const texto = linea.replace(/^[-•]\s*/, "").trim();
    if (!texto) return;

    if (texto.toLowerCase().includes("repuestos solicitados")) return;
    if (texto.toLowerCase().includes("acciones requeridas")) return;

    items.push({
      id: crearId(),
      equipoId,
      tipo: "trabajo",
      descripcion: texto,
      cantidad: 1,
      unitario: 0,
    });
  });

  if (revision?.horas_hombre && Number(revision.horas_hombre) > 0) {
    items.push({
      id: crearId(),
      equipoId,
      tipo: "mano_obra",
      descripcion: "Mano de obra servicio técnico",
      cantidad: Number(revision.horas_hombre),
      unitario: 0,
    });
  }

  if (!items.length) {
    items.push({
      id: crearId(),
      equipoId,
      tipo: "otro",
      descripcion: "",
      cantidad: 1,
      unitario: 0,
    });
  }

  return items;
}

function formatearMoneda(valor: number) {
  return `$${Math.round(valor || 0).toLocaleString("es-CL")}`;
}

export default function CotizacionInterna({ ordenId }: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [items, setItems] = useState<ItemCotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [incluirIva, setIncluirIva] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    if (!ordenId) {
      const equipoGeneral = {
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
      const { data: hijos } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie")
        .eq("orden_padre_id", ordenId)
        .order("created_at", { ascending: true });

      let equiposBase: Equipo[] = hijos || [];

      if (!equiposBase.length) {
        const { data: orden } = await supabase
          .from("ordenes")
          .select("id,codigo,equipo,marca,modelo,numero_serie")
          .eq("id", ordenId)
          .single();

        if (orden) equiposBase = [orden];
      }

      const nuevosItems: ItemCotizacion[] = [];

      for (const equipo of equiposBase) {
        const { data: revision } = await supabase
          .from("revisiones_jefe")
          .select("orden_id,horas_hombre,procedimiento_aprobado,repuestos_aprobados")
          .eq("orden_id", equipo.id)
          .maybeSingle();

        nuevosItems.push(...crearItemsDesdeRevision(equipo.id, revision));
      }

      setEquipos(equiposBase);
      setItems(nuevosItems);
    } catch (e: any) {
      alert(e.message || "No se pudo cargar la cotización interna");
    } finally {
      setLoading(false);
    }
  }

  function agregarItem(equipoId: string, tipo: ItemCotizacion["tipo"] = "otro") {
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
  }

  function eliminarItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  function actualizarItem(
    itemId: string,
    campo: keyof ItemCotizacion,
    valor: string | number
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
      })
    );
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

  function guardarLocal() {
    if (!ordenId) return;

    localStorage.setItem(
      `cotizacion-interna-${ordenId}`,
      JSON.stringify({
        ordenId,
        items,
        totalNeto,
        iva,
        totalFinal,
        updated_at: new Date().toISOString(),
      })
    );

    setGuardadoOk(true);
    setTimeout(() => setGuardadoOk(false), 2200);
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
            Los ítems se cargan desde la revisión técnica. Puedes editar
            cantidades, valores y agregar ítems manuales.
          </p>
        </div>

        <button type="button" onClick={guardarLocal}>
          {guardadoOk ? "✓ Guardado" : "Guardar cotización"}
        </button>
      </div>

      <div className="ivaBox">
        <label>
          <input
            type="checkbox"
            checked={incluirIva}
            onChange={(event) => setIncluirIva(event.target.checked)}
          />
          Incluir IVA 19%
        </label>
      </div>

      <div className="equipos">
        {equipos.map((equipo, index) => {
          const itemsEquipo = items.filter((item) => item.equipoId === equipo.id);
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
                                  event.target.value as ItemCotizacion["tipo"]
                                )
                              }
                            >
                              <option value="repuesto">Repuesto</option>
                              <option value="trabajo">Trabajo</option>
                              <option value="mano_obra">Mano de obra</option>
                              <option value="servicio">Servicio externo</option>
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
                                  event.target.value
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
                                  event.target.value
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
                                  event.target.value
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
                  onClick={() => agregarItem(equipo.id, "trabajo")}
                >
                  + Trabajo
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