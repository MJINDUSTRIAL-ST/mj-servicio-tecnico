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
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");

  useEffect(() => {
    cargarResumen();
  }, [ordenId, email]);

  async function cargarResumen() {
    const { data: ordenData } = await supabase
      .from("ordenes")
      .select("empresa_id,cliente,cliente_email")
      .eq("id", ordenId)
      .maybeSingle();

    const ordenActual = (ordenData || {}) as OrdenCliente;

    let nombreEmpresa: string | null = null;
    let solicitante: ClienteAcceso | null = null;

    if (ordenActual.empresa_id) {
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("nombre")
        .eq("id", ordenActual.empresa_id)
        .maybeSingle();

      nombreEmpresa = empresaData?.nombre || null;
    }

    const emailSolicitante = (
      ordenActual.cliente_email ||
      email ||
      ""
    )
      .trim()
      .toLowerCase();

    if (emailSolicitante) {
      const { data: solicitanteData } = await supabase
        .from("clientes")
        .select("id,nombre,email,telefono,empresa,empresa_id")
        .eq("email", emailSolicitante)
        .maybeSingle();

      solicitante = (solicitanteData as ClienteAcceso | null) || null;
    }

    if (!nombreEmpresa && solicitante?.empresa) {
      nombreEmpresa = solicitante.empresa;
    }

    setEmpresaNombre(nombreEmpresa);
    setClienteSolicitanteId(solicitante?.id || null);
  }

  async function cargarAccesos() {
    setCargando(true);

    const [
      { data: clientesData, error: clientesError },
      { data: accesosData, error: accesosError },
    ] = await Promise.all([
      supabase
        .from("clientes")
        .select("id,nombre,email,telefono,empresa,empresa_id")
        .order("nombre", { ascending: true }),

      supabase
        .from("orden_clientes_acceso")
        .select("cliente_id")
        .eq("orden_id", ordenId),
    ]);

    if (clientesError || accesosError) {
      alert(
        clientesError?.message ||
          accesosError?.message ||
          "No se pudieron cargar los accesos."
      );
      setCargando(false);
      return;
    }

    const clientesLista = (clientesData || []) as ClienteAcceso[];
    const idsAcceso = new Set(
      (accesosData || []).map(
        (acceso: { cliente_id: string }) => acceso.cliente_id
      )
    );

    let solicitanteId = clienteSolicitanteId;

    if (!solicitanteId && email) {
      const emailLimpio = email.trim().toLowerCase();
      const solicitante = clientesLista.find(
        (item) => item.email?.trim().toLowerCase() === emailLimpio
      );
      solicitanteId = solicitante?.id || null;
      setClienteSolicitanteId(solicitanteId);
    }

    const accesoActual = clientesLista.filter(
      (item) => idsAcceso.has(item.id) || item.id === solicitanteId
    );

    setTodosClientes(clientesLista);
    setClientesConAcceso(accesoActual);
    setCargando(false);
  }

  async function abrirGestionAccesos() {
    setModalAbierto(true);
    setClienteSeleccionado("");
    await cargarAccesos();
  }

  async function agregarAcceso() {
    if (!clienteSeleccionado) {
      alert("Selecciona un cliente.");
      return;
    }

    if (clienteSeleccionado === clienteSolicitanteId) {
      alert("El cliente solicitante ya tiene acceso a la OT.");
      return;
    }

    if (clientesConAcceso.some((item) => item.id === clienteSeleccionado)) {
      alert("Este cliente ya tiene acceso a la OT.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("orden_clientes_acceso").insert({
      orden_id: ordenId,
      cliente_id: clienteSeleccionado,
    });

    setGuardando(false);

    if (error) {
      alert("No se pudo otorgar acceso: " + error.message);
      return;
    }

    setClienteSeleccionado("");
    await cargarAccesos();
  }

  async function quitarAcceso(clienteId: string) {
    if (clienteId === clienteSolicitanteId) {
      alert("No se puede quitar el acceso del cliente solicitante.");
      return;
    }

    const confirmar = window.confirm(
      "¿Quitar el acceso de este cliente a la OT?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("orden_clientes_acceso")
      .delete()
      .eq("orden_id", ordenId)
      .eq("cliente_id", clienteId);

    if (error) {
      alert("No se pudo quitar el acceso: " + error.message);
      return;
    }

    await cargarAccesos();
  }

  const clientesDisponibles = useMemo(() => {
    const idsConAcceso = new Set(clientesConAcceso.map((item) => item.id));

    return todosClientes.filter(
      (item) =>
        item.id !== clienteSolicitanteId && !idsConAcceso.has(item.id)
    );
  }, [todosClientes, clientesConAcceso, clienteSolicitanteId]);

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
      </section>

      {modalAbierto ? (
        <div className="modalOverlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <p className="eyebrow">Acceso al portal cliente</p>
                <h3>Gestionar accesos a la OT</h3>
                <p className="modalDescription">
                  Agrega clientes previamente creados para que puedan ver esta
                  orden desde su portal.
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
                  <h4>Clientes con acceso</h4>

                  {clientesConAcceso.length === 0 ? (
                    <p className="emptyText">
                      No hay clientes adicionales con acceso.
                    </p>
                  ) : (
                    <div className="accessList">
                      {clientesConAcceso.map((item) => {
                        const esSolicitante = item.id === clienteSolicitanteId;

                        return (
                          <article key={item.id} className="accessItem">
                            <div>
                              <div className="accessTitle">
                                <strong>{item.nombre}</strong>

                                {esSolicitante ? (
                                  <span>Solicitante</span>
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
                                onClick={() => quitarAcceso(item.id)}
                              >
                                Quitar acceso
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
                      onClick={agregarAcceso}
                      disabled={guardando || !clienteSeleccionado}
                    >
                      {guardando ? "Guardando..." : "Otorgar acceso"}
                    </button>
                  </div>

                  {clientesDisponibles.length === 0 ? (
                    <p className="emptyText">
                      Todos los clientes disponibles ya tienen acceso.
                    </p>
                  ) : null}
                </section>
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
        }
      `}</style>
    </>
  );
}