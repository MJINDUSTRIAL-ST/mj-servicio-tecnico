"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  ordenId: string;
  cliente?: string | null;
  email?: string | null;
  supabase: any;
  onActualizar: (datos: {
    cliente?: string | null;
    cliente_email?: string | null;
  }) => void;
};

type ClienteAcceso = {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  empresa?: string | null;
  empresa_id?: string | null;
};

type OrdenCliente = {
  empresa_id?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
};

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="campo">
      <div className="campoLabel">{label}:</div>
      <div className="campoValue">{value || "-"}</div>
    </div>
  );
}

function mismosIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false;

  const ordenA = [...a].sort();
  const ordenB = [...b].sort();

  return ordenA.every((id, index) => id === ordenB[index]);
}

export default function DetalleCliente({
  ordenId,
  cliente,
  email,
  supabase,
}: Props) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [empresaNombre, setEmpresaNombre] = useState<string | null>(null);
  const [todosClientes, setTodosClientes] = useState<ClienteAcceso[]>([]);
  const [clientesConAcceso, setClientesConAcceso] = useState<ClienteAcceso[]>(
    []
  );
  const [clienteSolicitanteId, setClienteSolicitanteId] = useState<
    string | null
  >(null);
  const [idsAccesoOriginales, setIdsAccesoOriginales] = useState<string[]>([]);
  const [idsSeleccionados, setIdsSeleccionados] = useState<string[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [mensajeGuardado, setMensajeGuardado] = useState("");

  useEffect(() => {
    cargarDatosAcceso(false);
  }, [ordenId, email]);

  async function cargarDatosAcceso(prepararEdicion: boolean) {
    if (prepararEdicion) {
      setCargando(true);
    }

    const [
      { data: ordenData, error: ordenError },
      { data: clientesData, error: clientesError },
      { data: accesosData, error: accesosError },
    ] = await Promise.all([
      supabase
        .from("ordenes")
        .select("empresa_id,cliente,cliente_email")
        .eq("id", ordenId)
        .maybeSingle(),

      supabase
        .from("clientes")
        .select("id,nombre,email,telefono,empresa,empresa_id")
        .order("nombre", { ascending: true }),

      supabase
        .from("orden_clientes_acceso")
        .select("cliente_id")
        .eq("orden_id", ordenId),
    ]);

    if (ordenError || clientesError || accesosError) {
      alert(
        ordenError?.message ||
          clientesError?.message ||
          accesosError?.message ||
          "No se pudieron cargar los accesos."
      );

      setCargando(false);
      return;
    }

    const ordenActual = (ordenData || {}) as OrdenCliente;
    const clientesLista = (clientesData || []) as ClienteAcceso[];

    const emailSolicitante = (
      ordenActual.cliente_email ||
      email ||
      ""
    )
      .trim()
      .toLowerCase();

    const solicitante =
      clientesLista.find(
        (item) => item.email?.trim().toLowerCase() === emailSolicitante
      ) || null;

    const solicitanteId = solicitante?.id || null;

    const idsExtras: string[] = Array.from(
      new Set<string>(
        ((accesosData || []) as Array<{ cliente_id: string }>).map(
          (acceso) => acceso.cliente_id
        )
      )
    );

    const idsVisibles: string[] = Array.from(
      new Set<string>([
        ...idsExtras,
        ...(solicitanteId ? [solicitanteId] : []),
      ])
    );

    let nombreEmpresa: string | null = null;

    if (ordenActual.empresa_id) {
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("nombre")
        .eq("id", ordenActual.empresa_id)
        .maybeSingle();

      nombreEmpresa = empresaData?.nombre || null;
    }

    if (!nombreEmpresa && solicitante?.empresa) {
      nombreEmpresa = solicitante.empresa;
    }

    const accesoActual = clientesLista.filter((item) =>
      idsVisibles.includes(item.id)
    );

    setEmpresaNombre(nombreEmpresa);
    setTodosClientes(clientesLista);
    setClienteSolicitanteId(solicitanteId);
    setIdsAccesoOriginales(idsExtras);
    setClientesConAcceso(accesoActual);

    if (prepararEdicion) {
      setIdsSeleccionados(idsVisibles);
      setClienteSeleccionado("");
    }

    setCargando(false);
  }

  async function abrirGestionAccesos() {
    setMensajeGuardado("");
    setModalAbierto(true);
    await cargarDatosAcceso(true);
  }

  function agregarALista() {
    if (!clienteSeleccionado) {
      alert("Selecciona un cliente.");
      return;
    }

    if (idsSeleccionados.includes(clienteSeleccionado)) {
      alert("Este cliente ya está en la lista.");
      return;
    }

    setIdsSeleccionados((prev) => [...prev, clienteSeleccionado]);
    setClienteSeleccionado("");
  }

  function quitarDeLista(clienteId: string) {
    if (clienteId === clienteSolicitanteId) {
      alert("No se puede quitar al cliente solicitante.");
      return;
    }

    setIdsSeleccionados((prev) => prev.filter((id) => id !== clienteId));
  }

  async function guardarAccesos() {
    const seleccionadosExtras = idsSeleccionados.filter(
      (id) => id !== clienteSolicitanteId
    );

    const idsAgregar = seleccionadosExtras.filter(
      (id) => !idsAccesoOriginales.includes(id)
    );

    const idsQuitar = idsAccesoOriginales.filter(
      (id) => !seleccionadosExtras.includes(id)
    );

    if (idsAgregar.length === 0 && idsQuitar.length === 0) {
      setModalAbierto(false);
      return;
    }

    setGuardando(true);

    if (idsAgregar.length > 0) {
      const { error: errorAgregar } = await supabase
        .from("orden_clientes_acceso")
        .insert(
          idsAgregar.map((clienteId) => ({
            orden_id: ordenId,
            cliente_id: clienteId,
          }))
        );

      if (errorAgregar) {
        setGuardando(false);
        alert("No se pudieron guardar los nuevos accesos: " + errorAgregar.message);
        return;
      }
    }

    if (idsQuitar.length > 0) {
      const { error: errorQuitar } = await supabase
        .from("orden_clientes_acceso")
        .delete()
        .eq("orden_id", ordenId)
        .in("cliente_id", idsQuitar);

      if (errorQuitar) {
        setGuardando(false);
        alert("No se pudieron quitar algunos accesos: " + errorQuitar.message);
        return;
      }
    }

    await cargarDatosAcceso(false);

    setGuardando(false);
    setModalAbierto(false);
    setMensajeGuardado("Accesos guardados correctamente.");

    window.setTimeout(() => {
      setMensajeGuardado("");
    }, 4000);
  }

  const clientesSeleccionados = useMemo(() => {
    return todosClientes.filter((item) => idsSeleccionados.includes(item.id));
  }, [todosClientes, idsSeleccionados]);

  const clientesDisponibles = useMemo(() => {
    return todosClientes.filter((item) => !idsSeleccionados.includes(item.id));
  }, [todosClientes, idsSeleccionados]);

  const idsSeleccionadosExtras = useMemo(() => {
    return idsSeleccionados.filter((id) => id !== clienteSolicitanteId);
  }, [idsSeleccionados, clienteSolicitanteId]);

  const hayCambios = useMemo(() => {
    return !mismosIds(idsAccesoOriginales, idsSeleccionadosExtras);
  }, [idsAccesoOriginales, idsSeleccionadosExtras]);

  return (
    <>
      <section className="card">
        <div className="header">
          <h2>Detalle del cliente</h2>

          <div className="headerActions">
            <button
              type="button"
              className="secondaryButton"
              onClick={abrirGestionAccesos}
            >
              Gestionar accesos
            </button>

            <button
              type="button"
              onClick={() =>
                (window.location.href = `/dashboard/servicio-tecnico/nueva?editar=1&id=${ordenId}`)
              }
            >
              Modificar
            </button>
          </div>
        </div>

        <div className="grid">
          <Campo label="Cliente" value={cliente} />
          <Campo label="Email" value={email} />
          <Campo label="Empresa" value={empresaNombre} />
        </div>

        <div className="accessSummary">
          <div className="accessSummaryHeader">
            <span>Acceso al portal</span>
            <strong>{clientesConAcceso.length}</strong>
          </div>

          {clientesConAcceso.length === 0 ? (
            <p className="accessSummaryEmpty">
              No se pudo identificar un cliente con acceso.
            </p>
          ) : (
            <div className="accessChips">
              {clientesConAcceso.map((item) => (
                <span key={item.id}>
                  {item.nombre}
                  {item.id === clienteSolicitanteId ? " · Solicitante" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {mensajeGuardado ? (
          <div className="successMessage">{mensajeGuardado}</div>
        ) : null}
      </section>

      {modalAbierto ? (
        <div className="modalOverlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acceso al portal cliente</p>
                <h3>Gestionar accesos a la OT</h3>
                <p className="modalDescription">
                  Agrega o quita clientes y luego presiona Guardar accesos.
                </p>
              </div>

              <button
                type="button"
                className="closeButton"
                onClick={() => setModalAbierto(false)}
              >
                ×
              </button>
            </div>

            {cargando ? (
              <p className="loadingText">Cargando clientes y accesos...</p>
            ) : (
              <>
                <section className="accessSection">
                  <h4>Clientes que tendrán acceso</h4>

                  {clientesSeleccionados.length === 0 ? (
                    <p className="emptyText">
                      No hay clientes seleccionados.
                    </p>
                  ) : (
                    <div className="accessList">
                      {clientesSeleccionados.map((item) => {
                        const esSolicitante = item.id === clienteSolicitanteId;
                        const esNuevo =
                          !esSolicitante &&
                          !idsAccesoOriginales.includes(item.id);

                        return (
                          <article key={item.id} className="accessItem">
                            <div>
                              <div className="accessTitle">
                                <strong>{item.nombre}</strong>

                                {esSolicitante ? (
                                  <span>Solicitante</span>
                                ) : esNuevo ? (
                                  <span>Por guardar</span>
                                ) : (
                                  <span>Acceso adicional</span>
                                )}
                              </div>

                              <p>{item.email || "Sin email"}</p>
                              <p>
                                {item.empresa || "Persona natural / sin empresa"}
                              </p>
                            </div>

                            {!esSolicitante ? (
                              <button
                                type="button"
                                className="removeButton"
                                onClick={() => quitarDeLista(item.id)}
                              >
                                Quitar
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="addSection">
                  <h4>Agregar otro cliente</h4>

                  <div className="addRow">
                    <select
                      value={clienteSeleccionado}
                      onChange={(event) =>
                        setClienteSeleccionado(event.target.value)
                      }
                    >
                      <option value="">Selecciona un cliente...</option>

                      {clientesDisponibles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                          {item.empresa ? ` · ${item.empresa}` : ""}
                          {item.email ? ` · ${item.email}` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="addButton"
                      onClick={agregarALista}
                      disabled={!clienteSeleccionado}
                    >
                      Agregar a la lista
                    </button>
                  </div>

                  {clientesDisponibles.length === 0 ? (
                    <p className="emptyText">
                      Todos los clientes disponibles ya están en la lista.
                    </p>
                  ) : null}
                </section>

                <div className="modalActions">
                  <button
                    type="button"
                    className="cancelButton"
                    onClick={() => setModalAbierto(false)}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="saveButton"
                    onClick={guardarAccesos}
                    disabled={guardando || !hayCambios}
                  >
                    {guardando
                      ? "Guardando..."
                      : hayCambios
                      ? "Guardar accesos"
                      : "Sin cambios"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .card {
          background: white;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        h2 {
          font-size: 18px;
          margin: 0;
          color: #0f172a;
        }

        .headerActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 9px 13px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
          font-size: 13px;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .secondaryButton {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .grid {
          display: grid;
          gap: 10px;
        }

        .campo {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 10px;
          font-size: 14px;
        }

        .campoLabel {
          color: #64748b;
          font-weight: 800;
        }

        .campoValue {
          color: #0f172a;
          font-weight: 600;
          min-width: 0;
          word-break: break-word;
        }

        .accessSummary {
          margin-top: 16px;
          border-radius: 14px;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          padding: 13px;
        }

        .accessSummaryHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .accessSummaryHeader span {
          color: #475569;
          font-size: 12px;
          font-weight: 900;
        }

        .accessSummaryHeader strong {
          display: inline-flex;
          min-width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
        }

        .accessSummaryEmpty {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .accessChips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .accessChips span {
          border-radius: 999px;
          background: white;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
        }

        .successMessage {
          margin-top: 12px;
          border-radius: 12px;
          background: #dcfce7;
          color: #166534;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 70;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.62);
          padding: 18px;
        }

        .modal {
          width: min(760px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 22px;
          background: white;
          padding: 24px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 18px;
        }

        .eyebrow {
          margin: 0;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
        }

        h3 {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 22px;
        }

        .modalDescription {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.45;
        }

        .closeButton {
          width: 38px;
          height: 38px;
          padding: 0;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          font-size: 24px;
          flex: 0 0 auto;
        }

        .loadingText,
        .emptyText {
          color: #64748b;
          font-size: 14px;
        }

        .accessSection,
        .addSection {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
        }

        .addSection {
          margin-top: 16px;
        }

        h4 {
          margin: 0 0 12px;
          color: #0f172a;
          font-size: 15px;
        }

        .accessList {
          display: grid;
          gap: 10px;
        }

        .accessItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          border-radius: 14px;
          background: #f8fafc;
          padding: 13px;
        }

        .accessTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .accessTitle span {
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 900;
        }

        .accessItem p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .removeButton {
          background: #fee2e2;
          color: #b91c1c;
          white-space: nowrap;
        }

        .addRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
        }

        select {
          width: 100%;
          min-width: 0;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          padding: 10px;
          color: #0f172a;
        }

        .addButton {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
        }

        .cancelButton {
          background: #f1f5f9;
          color: #334155;
        }

        .saveButton {
          background: #2563eb;
          color: white;
        }

        @media (max-width: 680px) {
          .header,
          .accessItem {
            align-items: flex-start;
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .campo {
            grid-template-columns: 1fr;
            gap: 3px;
          }

          .addRow {
            grid-template-columns: 1fr;
          }

          .modalActions {
            flex-direction: column-reverse;
          }

          .modalActions button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}