import Link from "next/link";

export default function LogisticaPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>🚚 Logística</h1>

      <div style={{ display: "grid", gap: 16, maxWidth: 500 }}>
        <Link href="/dashboard/logistica/retiros">Retiros Agendados</Link>
        <Link href="/dashboard/logistica/despachos">Despachos Solicitados</Link>
        <Link href="/dashboard/logistica/agenda">Agenda Operativa</Link>
      </div>
    </main>
  );
}