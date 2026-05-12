"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

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

export default function DetalleServicioClientePage() {
  const params = useParams();
  const ordenId = Array.isArray(params.orden) ? params.orden[0] : params.orden;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenId)
        .ilike("cliente_email", email)
        .single();

      if (error || !data) {
        setError("Orden no encontrada o sin permiso de acceso");
        setLoading(false);
        return;
      }

      setOrden(data as Orden);
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

  const fotosIngreso = normalizarFotos(orden.fotos_estado_inicial);

  return (
    <main className="space-y-6 p-6">
      <Link href="/cliente/portal/servicio-tecnico" className="text-blue-600">
        ← Volver
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{orden.codigo}</h1>
        <p className="text-slate-500">{orden.equipo}</p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Información de ingreso</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoItem label="Cliente" value={orden.cliente} />
          <InfoItem label="Equipo" value={orden.equipo} />
          <InfoItem label="Marca" value={orden.marca} />
          <InfoItem label="Modelo" value={orden.modelo} />
          <InfoItem label="Número de serie" value={orden.numero_serie} />
          <InfoItem label="Prioridad" value={orden.prioridad} />
          <InfoItem label="Estado actual" value={orden.estado} />
          <InfoItem label="Fecha de ingreso" value={formatFecha(orden.created_at)} />
        </div>

        <InfoBlock label="Accesorios entregados" value={orden.accesorios_entregados} />
        <InfoBlock label="Problema reportado" value={orden.problema_reportado} />
        <InfoBlock label="Observaciones iniciales" value={orden.observaciones_iniciales} />
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