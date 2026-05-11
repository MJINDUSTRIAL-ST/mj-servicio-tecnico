import Link from "next/link";
import { supabase } from "../../../../lib/supabase";

type EtapaKey =
  | "Ingreso"
  | "Revisión"
  | "Cotización"
  | "Mantenimiento"
  | "Reparación"
  | "Listo"
  | "Entregado";

type ReporteFoto = {
  id: string;
  foto_url: string;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type Reporte = {
  id: string;
  etapa: EtapaKey;
  descripcion: string | null;
  hallazgos: string | null;
  acciones: string | null;
  costo: number | null;
  created_at: string;
  reporte_fotos?: ReporteFoto[];
};

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: EtapaKey;
  prioridad: string | null;
  created_at: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  accesorios_entregados: string | null;
  problema_reportado: string | null;
  observaciones_iniciales: string | null;
  fotos_estado_inicial: string | string[] | null;
};

const etapas: EtapaKey[] = [
  "Ingreso",
  "Revisión",
  "Cotización",
  "Mantenimiento",
  "Reparación",
  "Listo",
  "Entregado",
];

const iconos: Record<EtapaKey, string> = {
  Ingreso: "📦",
  Revisión: "🔍",
  Cotización: "📄",
  Mantenimiento: "⚙️",
  Reparación: "🔧",
  Listo: "✅",
  Entregado: "🚚",
};

function normalizarFotos(fotos: string | string[] | null) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) {
    return fotos.filter(Boolean);
  }

  try {
    const parsed = JSON.parse(fotos);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }
  } catch {}

  return fotos
    .split(",")
    .map((foto) => foto.trim())
    .filter(Boolean);
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL");
  } catch {
    return fecha;
  }
}

function formatMoneda(valor?: number | null) {
  if (valor == null) return "";

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function getCircleClass(etapa: EtapaKey, etapaActual: EtapaKey): string {
  const actual = etapas.indexOf(etapaActual);
  const actualEtapa = etapas.indexOf(etapa);

  if (actualEtapa < actual) return "bg-blue-100 text-blue-700";
  if (actualEtapa === actual) return "bg-blue-600 text-white";
  return "bg-slate-200 text-slate-400";
}

function getTextClass(etapa: EtapaKey, etapaActual: EtapaKey): string {
  const actual = etapas.indexOf(etapaActual);
  const actualEtapa = etapas.indexOf(etapa);

  if (actualEtapa < actual) return "text-blue-600";
  if (actualEtapa === actual) return "text-blue-700 font-semibold";
  return "text-slate-400";
}

function getBadgeClass(etapa: EtapaKey): string {
  switch (etapa) {
    case "Listo":
      return "bg-green-100 text-green-700";
    case "Mantenimiento":
      return "bg-cyan-100 text-cyan-700";
    case "Cotización":
      return "bg-purple-100 text-purple-700";
    case "Revisión":
      return "bg-yellow-100 text-yellow-700";
    case "Ingreso":
      return "bg-slate-100 text-slate-700";
    case "Reparación":
      return "bg-orange-100 text-orange-700";
    case "Entregado":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function DetalleServicioPage({
  params,
}: {
  params: Promise<{ orden: string }>;
}) {
  const { orden } = await params;

  const { data: row, error } = await supabase
    .from("ordenes")
    .select("*")
    .or(`codigo.eq.${orden},id.eq.${orden}`)
    .single();

  if (error || !row) {
    return (
      <main className="p-6">
        <Link href="/cliente/portal/servicio-tecnico" className="text-blue-600">
          ← Volver
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          Orden no encontrada: {orden}
        </div>
      </main>
    );
  }

  const ordenData = row as Orden;
  const fotosIngreso = normalizarFotos(ordenData.fotos_estado_inicial);

  const { data: reportesData } = await supabase
    .from("reportes")
    .select(
      `
      *,
      reporte_fotos (
        id,
        foto_url,
        comentario,
        orden,
        es_principal
      )
    `
    )
    .eq("orden_id", ordenData.id)
    .order("created_at", { ascending: false });

  const reportes = ((reportesData || []) as Reporte[]).map((reporte) => ({
    ...reporte,
    reporte_fotos: [...(reporte.reporte_fotos || [])].sort((a, b) => {
      const ordenA = a.orden ?? 0;
      const ordenB = b.orden ?? 0;
      return ordenA - ordenB;
    }),
  }));

  const etapaActual = etapas.includes(ordenData.estado)
    ? ordenData.estado
    : "Ingreso";

  return (
    <main className="space-y-6 p-6">
      <Link href="/cliente/portal/servicio-tecnico" className="text-blue-600">
        ← Volver
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{ordenData.codigo}</h1>
        <p className="text-slate-500">{ordenData.equipo}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {etapas.map((etapa, i) => (
            <div key={etapa} className="flex items-center">
              <div className="flex min-w-[72px] flex-col items-center gap-2">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${getCircleClass(
                    etapa,
                    etapaActual
                  )}`}
                >
                  {iconos[etapa]}
                </div>

                <span className={`text-sm ${getTextClass(etapa, etapaActual)}`}>
                  {etapa}
                </span>
              </div>

              {i < etapas.length - 1 && (
                <div className="mx-2 h-[2px] w-10 bg-slate-200" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Información de ingreso</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoItem label="Cliente" value={ordenData.cliente} />
          <InfoItem label="Equipo" value={ordenData.equipo} />
          <InfoItem label="Marca" value={ordenData.marca} />
          <InfoItem label="Modelo" value={ordenData.modelo} />
          <InfoItem label="Número de serie" value={ordenData.numero_serie} />
          <InfoItem label="Prioridad" value={ordenData.prioridad} />
          <InfoItem label="Estado actual" value={ordenData.estado} />
          <InfoItem label="Fecha de ingreso" value={formatFecha(ordenData.created_at)} />
        </div>

        <InfoBlock
          label="Accesorios entregados"
          value={ordenData.accesorios_entregados}
        />

        <InfoBlock
          label="Problema reportado"
          value={ordenData.problema_reportado}
        />

        <InfoBlock
          label="Observaciones iniciales"
          value={ordenData.observaciones_iniciales}
        />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Fotos del estado inicial</h3>

        {fotosIngreso.length === 0 ? (
          <p className="text-slate-500">No hay fotos iniciales registradas.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {fotosIngreso.map((foto, i) => (
              <a
                key={`${foto}-${i}`}
                href={foto}
                target="_blank"
                className="block h-32 w-32 overflow-hidden rounded-lg border bg-slate-100"
              >
                <img
                  src={foto}
                  alt={`Foto ingreso ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Historial de Reportes</h3>

        {reportes.length === 0 ? (
          <p className="text-slate-500">
            Todavía no hay reportes para esta orden.
          </p>
        ) : (
          <div className="space-y-4">
            {reportes.map((item) => {
              const fotos = item.reporte_fotos || [];

              return (
                <div key={item.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getBadgeClass(
                          item.etapa
                        )}`}
                      >
                        {item.etapa}
                      </span>
                    </span>

                    <span>{formatFecha(item.created_at)}</span>
                  </div>

                  {item.descripcion && (
                    <p className="font-medium">{item.descripcion}</p>
                  )}

                  {item.hallazgos && (
                    <p className="text-sm text-slate-600">
                      <strong>Hallazgos:</strong> {item.hallazgos}
                    </p>
                  )}

                  {item.acciones && (
                    <p className="text-sm text-slate-600">
                      <strong>Acciones:</strong> {item.acciones}
                    </p>
                  )}

                  {item.costo != null && (
                    <p className="text-sm text-slate-600">
                      <strong>Costo:</strong> {formatMoneda(item.costo)}
                    </p>
                  )}

                  {fotos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fotos.map((foto) => (
                        <a
                          key={foto.id}
                          href={foto.foto_url}
                          target="_blank"
                          className="block h-20 w-20 overflow-hidden rounded border bg-slate-100"
                        >
                          <img
                            src={foto.foto_url}
                            className="h-full w-full object-cover"
                            alt="foto reporte"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-semibold">{value || "-"}</p>
    </div>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap">{value || "-"}</p>
    </div>
  );
}