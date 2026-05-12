"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type EtapaKey =
  | "Ingreso"
  | "Revisión"
  | "Cotización"
  | "Mantenimiento"
  | "Reparación"
  | "Listo"
  | "Entregado";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: string;
  prioridad: string | null;
  created_at: string | null;
  cliente_email: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  accesorios_entregados: string | null;
  problema_reportado: string | null;
  observaciones_iniciales: string | null;
  fotos_estado_inicial: string | string[] | null;
};

type ReporteFoto = {
  id: string;
  foto_url: string;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type Reporte = {
  id: string;
  orden_id: string;
  etapa: string;
  descripcion: string | null;
  hallazgos: string | null;
  acciones: string | null;
  costo: number | null;
  created_at: string;
  reporte_fotos?: ReporteFoto[];
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

function normalizarEstado(estado?: string | null): EtapaKey {
  if (!estado) return "Ingreso";

  if (estado === "Mant.") return "Mantenimiento";
  if (estado === "Repar.") return "Reparación";
  if (estado === "Listo p/Entrega") return "Listo";
  if (etapas.includes(estado as EtapaKey)) return estado as EtapaKey;

  return "Ingreso";
}

function normalizarFotos(fotos: string | string[] | null) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) return fotos.filter(Boolean);

  try {
    const parsed = JSON.parse(fotos);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
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
  const index = etapas.indexOf(etapa);

  if (index < actual) return "bg-blue-100 text-blue-700 border-blue-200";
  if (index === actual) return "bg-blue-600 text-white border-blue-600";
  return "bg-slate-100 text-slate-400 border-slate-200";
}

function getTextClass(etapa: EtapaKey, etapaActual: EtapaKey): string {
  const actual = etapas.indexOf(etapaActual);
  const index = etapas.indexOf(etapa);

  if (index < actual) return "text-blue-600";
  if (index === actual) return "text-blue-700 font-semibold";
  return "text-slate-400";
}

function getLineClass(index: number, etapaActual: EtapaKey): string {
  const actual = etapas.indexOf(etapaActual);
  return index < actual ? "bg-blue-500" : "bg-slate-200";
}

function getBadgeClass(etapa: string): string {
  const etapaNormalizada = normalizarEstado(etapa);

  switch (etapaNormalizada) {
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

export default function DetalleServicioClientePage() {
  const params = useParams();
  const ordenId = Array.isArray(params.orden) ? params.orden[0] : params.orden;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const etapaActual = useMemo(() => {
    return normalizarEstado(orden?.estado);
  }, [orden?.estado]);

  const fotosIngreso = useMemo(() => {
    return normalizarFotos(orden?.fotos_estado_inicial || null);
  }, [orden?.fotos_estado_inicial]);

  useEffect(() => {
    const cargarOrden = async () => {
      setLoading(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const email = session?.user?.email?.trim().toLowerCase();

      if (!email) {
        setError("No hay sesión activa");
        setLoading(false);
        return;
      }

      const { data: ordenData, error: ordenError } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenId)
        .ilike("cliente_email", email)
        .single();

      if (ordenError || !ordenData) {
        setError("Orden no encontrada o sin permiso de acceso");
        setLoading(false);
        return;
      }

      const { data: reportesData, error: reportesError } = await supabase
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

      if (reportesError) {
        setError(reportesError.message);
        setLoading(false);
        return;
      }

      const reportesOrdenados = ((reportesData || []) as Reporte[]).map(
        (reporte) => ({
          ...reporte,
          reporte_fotos: [...(reporte.reporte_fotos || [])].sort((a, b) => {
            const ordenA = a.orden ?? 0;
            const ordenB = b.orden ?? 0;
            return ordenA - ordenB;
          }),
        })
      );

      setOrden(ordenData as Orden);
      setReportes(reportesOrdenados);
      setLoading(false);
    };

    cargarOrden();
  }, [ordenId]);

  if (loading) {
    return <main className="p-6">Cargando orden...</main>;
  }

  if (error || !orden) {
    return (
      <main className="p-6">
        <Link href="/cliente/portal/servicio-tecnico" className="text-blue-600">
          ← Volver
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          {error || "Orden no encontrada"}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <Link
        href="/cliente/portal/servicio-tecnico"
        className="inline-block rounded-lg border bg-white px-4 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
      >
        ← Volver
      </Link>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Orden de Servicio
            </p>
            <h1 className="mt-1 text-4xl font-bold text-slate-900">
              {orden.codigo}
            </h1>
            <p className="mt-2 text-lg text-slate-500">{orden.equipo}</p>
          </div>

          <span
            className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBadgeClass(
              orden.estado
            )}`}
          >
            {orden.estado}
          </span>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Estado de avance
        </h2>

        <div className="overflow-x-auto">
          <div className="flex min-w-[760px] items-center justify-between">
            {etapas.map((etapa, index) => (
              <div key={etapa} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full border text-xl ${getCircleClass(
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

                {index < etapas.length - 1 && (
                  <div
                    className={`mx-3 h-[3px] flex-1 rounded-full ${getLineClass(
                      index,
                      etapaActual
                    )}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          Información de ingreso
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoItem label="Cliente" value={orden.cliente} />
          <InfoItem label="Equipo" value={orden.equipo} />
          <InfoItem label="Marca" value={orden.marca} />
          <InfoItem label="Modelo" value={orden.modelo} />
          <InfoItem label="Número de serie" value={orden.numero_serie} />
          <InfoItem label="Prioridad" value={orden.prioridad} />
          <InfoItem label="Estado actual" value={orden.estado} />
          <InfoItem
            label="Fecha de ingreso"
            value={formatFecha(orden.created_at)}
          />
        </div>

        <InfoBlock
          label="Accesorios entregados"
          value={orden.accesorios_entregados}
        />

        <InfoBlock
          label="Problema reportado"
          value={orden.problema_reportado}
        />

        <InfoBlock
          label="Observaciones iniciales"
          value={orden.observaciones_iniciales}
        />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          Fotos del estado inicial
        </h2>

        {fotosIngreso.length === 0 ? (
          <p className="text-slate-500">No hay fotos iniciales registradas.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {fotosIngreso.map((foto, i) => (
              <a
                key={`${foto}-${i}`}
                href={foto}
                target="_blank"
                className="block overflow-hidden rounded-2xl border bg-slate-100"
              >
                <img
                  src={foto}
                  alt={`Foto ingreso ${i + 1}`}
                  className="h-40 w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Historial de reportes
        </h2>

        {reportes.length === 0 ? (
          <p className="text-slate-500">
            Todavía no hay reportes técnicos para esta orden.
          </p>
        ) : (
          <div className="space-y-5">
            {reportes.map((reporte) => {
              const fotos = reporte.reporte_fotos || [];

              return (
                <article
                  key={reporte.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(
                        reporte.etapa
                      )}`}
                    >
                      {normalizarEstado(reporte.etapa)}
                    </span>

                    <span className="text-sm text-slate-500">
                      {formatFecha(reporte.created_at)}
                    </span>
                  </div>

                  {reporte.descripcion && (
                    <p className="mb-3 text-base font-semibold text-slate-900">
                      {reporte.descripcion}
                    </p>
                  )}

                  {reporte.hallazgos && (
                    <InfoBlock label="Hallazgos" value={reporte.hallazgos} />
                  )}

                  {reporte.acciones && (
                    <InfoBlock label="Acciones realizadas" value={reporte.acciones} />
                  )}

                  {reporte.costo != null && (
                    <InfoBlock label="Costo informado" value={formatMoneda(reporte.costo)} />
                  )}

                  {fotos.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-slate-600">
                        Fotos del reporte
                      </p>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {fotos.map((foto) => (
                          <a
                            key={foto.id}
                            href={foto.foto_url}
                            target="_blank"
                            className="block overflow-hidden rounded-xl border bg-white"
                          >
                            <img
                              src={foto.foto_url}
                              alt="Foto reporte"
                              className="h-32 w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value || "-"}</p>
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
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-slate-800">{value || "-"}</p>
    </div>
  );
}