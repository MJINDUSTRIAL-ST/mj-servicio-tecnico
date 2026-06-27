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

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 10, fontSize: 14 }}>
      <div style={{ color: "#64748b", fontWeight: 800 }}>{label}:</div>
      <div style={{ color: "#0f172a", fontWeight: 600 }}>{value || "-"}</div>
    </div>
  );
}

export default function DetalleCliente({
  ordenId,
  cliente,
  email,
  supabase,
  onActualizar,
}: Props) {
  async function modificarCliente() {
    const nuevoCliente = prompt("Cliente", cliente || "");
    if (nuevoCliente === null) return;

    const nuevoEmail = prompt("Email", email || "");
    if (nuevoEmail === null) return;

    const { error } = await supabase
      .from("ordenes")
      .update({
        cliente: nuevoCliente,
        cliente_email: nuevoEmail,
      })
      .eq("id", ordenId);

    if (error) {
      alert("Error actualizando cliente");
      return;
    }

    onActualizar({
      cliente: nuevoCliente,
      cliente_email: nuevoEmail,
    });

    alert("Cliente actualizado");
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Detalle del cliente</h2>
        <button onClick={modificarCliente}>Modificar</button>
      </div>

      <div className="grid">
        <Campo label="Cliente" value={cliente} />
        <Campo label="Email" value={email} />
      </div>

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

        .grid {
          display: grid;
          gap: 10px;
        }
      `}</style>
    </section>
  );
}