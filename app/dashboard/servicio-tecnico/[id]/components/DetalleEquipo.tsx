type OrdenEquipo = {
  id: string;
  codigo?: string | null;
  cliente?: string | null;
  equipo?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  created_at?: string | null;
  cliente_email?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  accesorios_entregados?: string | null;
  problema_reportado?: string | null;
  observaciones_iniciales?: string | null;
  fotos_estado_inicial?: string | string[] | null;
};

type Props = {
  orden: OrdenEquipo;
  onActualizar: (ordenActualizada: Partial<OrdenEquipo>) => void;
  supabase: any;
};

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, fontSize: 14 }}>
      <div style={{ color: "#64748b", fontWeight: 800 }}>{label}:</div>
      <div style={{ color: "#0f172a", fontWeight: 600 }}>{value || "-"}</div>
    </div>
  );
}

export default function DetalleEquipo({ orden, onActualizar, supabase }: Props) {
  async function modificarEquipo() {
    const nuevoTipo = prompt("Tipo", orden.equipo || "");
    if (nuevoTipo === null) return;

    const nuevaMarca = prompt("Marca", orden.marca || "");
    if (nuevaMarca === null) return;

    const nuevoModelo = prompt("Modelo", orden.modelo || "");
    if (nuevoModelo === null) return;

    const nuevaSerie = prompt("Número de serie", orden.numero_serie || "");
    if (nuevaSerie === null) return;

    const nuevosAccesorios = prompt("Accesorios entregados", orden.accesorios_entregados || "");
    if (nuevosAccesorios === null) return;

    const actualizada = {
      ...orden,
      equipo: nuevoTipo,
      marca: nuevaMarca,
      modelo: nuevoModelo,
      numero_serie: nuevaSerie,
      accesorios_entregados: nuevosAccesorios,
    };

    const { error } = await supabase
      .from("ordenes")
      .update({
        equipo: nuevoTipo,
        marca: nuevaMarca,
        modelo: nuevoModelo,
        numero_serie: nuevaSerie,
        accesorios_entregados: nuevosAccesorios,
      })
      .eq("id", orden.id);

    if (error) {
      alert("Error actualizando equipo");
      return;
    }

    onActualizar(actualizada);
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Detalle del equipo</h2>
        <button onClick={modificarEquipo}>Modificar</button>
      </div>

      <div className="grid">
        <Campo label="Tipo" value={orden.equipo} />
        <Campo label="Marca" value={orden.marca} />
        <Campo label="Modelo" value={orden.modelo} />
        <Campo label="Serie" value={orden.numero_serie} />
        <Campo label="Accesorios" value={orden.accesorios_entregados} />
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
          background: #f59e0b;
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