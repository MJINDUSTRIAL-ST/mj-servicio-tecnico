"use client";

type Props = {
  ordenId: string;
  problema?: string | null;
  observaciones?: string | null;
  supabase: any;
  onActualizar: (datos: any) => void;
};

export default function ProblemaOT({
  ordenId,
  problema,
  observaciones,
  supabase,
  onActualizar,
}: Props) {
  async function modificar() {
    const nuevoProblema = window.prompt("Problema reportado", problema || "");
    if (nuevoProblema === null) return;

    const nuevasObservaciones = window.prompt(
      "Observaciones iniciales",
      observaciones || ""
    );
    if (nuevasObservaciones === null) return;

    const { error } = await supabase
      .from("ordenes")
      .update({
        problema_reportado: nuevoProblema,
        observaciones_iniciales: nuevasObservaciones,
      })
      .eq("id", ordenId);

    if (error) {
      window.alert("Error actualizando información");
      return;
    }

    onActualizar({
      problema_reportado: nuevoProblema,
      observaciones_iniciales: nuevasObservaciones,
    });

    window.alert("Información actualizada");
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Problema reportado</h2>
        <button type="button" onClick={modificar}>
          Modificar
        </button>
      </div>

      <div className="bloque">
        <strong>Problema:</strong>
        <p>{problema || "-"}</p>
      </div>

      <div className="bloque">
        <strong>Observaciones:</strong>
        <p>{observaciones || "-"}</p>
      </div>

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
          background: #0f172a;
          color: white;
          border: none;
          padding: 9px 13px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
          font-size: 13px;
        }

        .bloque {
          margin-bottom: 12px;
          color: #334155;
          font-size: 14px;
        }

        p {
          margin: 6px 0 0;
          white-space: pre-wrap;
          line-height: 1.5;
        }
      `}</style>
    </section>
  );
}