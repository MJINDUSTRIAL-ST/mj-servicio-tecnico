import { supabase } from "@/app/lib/supabase";

type EtapaKey =
  | "Ingreso"
  | "Revisión"
  | "Cotización"
  | "Mant."
  | "Repar."
  | "Listo"
  | "Entregado";

type Archivo = {
  nombre: string;
  url: string;
};

type Reporte = {
  etapa: EtapaKey;
  tecnico: string;
  fecha: string;
  titulo: string;
  detalle: string;
  acciones?: string;
  hallazgos?: string;
  costo?: string;
  documentos?: Archivo[];
  fotos?: string[];
};

type OrdenDetalle = {
  numero: string;
  cliente: string;
  equipo: string;
  problema: string;
  etapaActual: EtapaKey;
  reportePdf: string;
  fotosIngreso: string[];
  historial: Reporte[];
};

const detalleBase: Omit<
  OrdenDetalle,
  "numero" | "cliente" | "equipo" | "problema"
> = {
  etapaActual: "Listo",
  reportePdf: "/docs/Informe de situacion 1604.pdf",
  fotosIngreso: ["/next.svg", "/vercel.svg"],
  historial: [
    {
      etapa: "Listo",
      tecnico: "francisco",
      fecha: "14/04/26 14:23",
      titulo: "equipo listo para entrega",
      detalle: "mantenimiento preventivo según cotización 2035",
      documentos: [
        {
          nombre: "Informe de situación 1604.pdf",
          url: "/docs/Informe de situacion 1604.pdf",
        },
      ],
    },
    {
      etapa: "Mant.",
      tecnico: "alvaro",
      fecha: "14/04/26 14:19",
      titulo: "se realiza mantenimiento preventivo",
      detalle: "mantención preventiva ejecutada",
      fotos: ["/next.svg"],
    },
    {
      etapa: "Cotización",
      tecnico: "francisco",
      fecha: "14/04/26 14:18",
      titulo: "se adjunta cotización 20235",
      detalle: "Costo: $15.000",
      documentos: [
        {
          nombre: "PDF Cotización",
          url: "/docs/Informe de situacion 1604.pdf",
        },
      ],
    },
    {
      etapa: "Revisión",
      tecnico: "alvaro",
      fecha: "14/04/26 14:16",
      titulo:
        "se realiza diagnóstico, se testea sin carga, se abre y verifica estado interno",
      detalle: "no se encuentran fallas de material, desgaste normal",
      fotos: ["/next.svg"],
    },
  ],
};

function getCircleClass(etapa: EtapaKey, etapaActual: EtapaKey): string {
  const orden: EtapaKey[] = [
    "Ingreso",
    "Revisión",
    "Cotización",
    "Mant.",
    "Repar.",
    "Listo",
    "Entregado",
  ];

  const actual = orden.indexOf(etapaActual);
  const actualEtapa = orden.indexOf(etapa);

  if (actualEtapa < actual) return "bg-blue-100 text-blue-700";
  if (actualEtapa === actual) return "bg-blue-600 text-white";
  return "bg-slate-200 text-slate-400";
}

function getTextClass(etapa: EtapaKey, etapaActual: EtapaKey): string {
  const orden: EtapaKey[] = [
    "Ingreso",
    "Revisión",
    "Cotización",
    "Mant.",
    "Repar.",
    "Listo",
    "Entregado",
  ];

  const actual = orden.indexOf(etapaActual);
  const actualEtapa = orden.indexOf(etapa);

  if (actualEtapa < actual) return "text-blue-600";
  if (actualEtapa === actual) return "text-blue-700 font-semibold";
  return "text-slate-400";
}

function getBadgeClass(etapa: EtapaKey): string {
  switch (etapa) {
    case "Listo":
      return "bg-green-100 text-green-700";
    case "Mant.":
      return "bg-cyan-100 text-cyan-700";
    case "Cotización":
      return "bg-purple-100 text-purple-700";
    case "Revisión":
      return "bg-yellow-100 text-yellow-700";
    case "Ingreso":
      return "bg-slate-100 text-slate-700";
    case "Repar.":
      return "bg-orange-100 text-orange-700";
    case "Entregado":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

const iconos: Record<EtapaKey, string> = {
  Ingreso: "📦",
  Revisión: "🔍",
  Cotización: "📄",
  "Mant.": "⚙️",
  "Repar.": "🔧",
  Listo: "✅",
  Entregado: "🚚",
};

const etapas: EtapaKey[] = [
  "Ingreso",
  "Revisión",
  "Cotización",
  "Mant.",
  "Repar.",
  "Listo",
  "Entregado",
];

export default async function DetalleServicioPage({
  params,
}: {
  params: Promise<{ orden: string }>;
}) {
  const { orden } = await params;

  const { data: rows, error } = await supabase.from("ordenes").select("*");

  if (error) {
    return <main className="p-6">Error Supabase: {error.message}</main>;
  }

  const row = rows?.find(
    (r: any) => String(r.numero).toLowerCase() === String(orden).toLowerCase()
  );

  if (!row) {
    return (
      <main className="p-6">
        Orden no encontrada: {orden}
        <pre>{JSON.stringify(rows, null, 2)}</pre>
      </main>
    );
  }

  const data: OrdenDetalle = {
    numero: row.numero ?? "",
    cliente: row.cliente ?? "",
    equipo: row.equipo ?? "",
    problema: row.problema ?? "",
    ...detalleBase,
  };

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{data.numero}</h1>
        <p className="text-slate-500">{data.equipo}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {etapas.map((etapa, i) => (
            <div key={etapa} className="flex items-center">
              <div className="flex flex-col items-center gap-2 min-w-[72px]">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${getCircleClass(
                    etapa,
                    data.etapaActual
                  )}`}
                >
                  {iconos[etapa]}
                </div>

                <span
                  className={`text-sm ${getTextClass(
                    etapa,
                    data.etapaActual
                  )}`}
                >
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

      <div className="bg-white rounded-2xl p-6 shadow-sm grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-500 text-sm">Cliente:</p>
          <p className="font-semibold">{data.cliente}</p>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Equipo:</p>
          <p className="font-semibold">{data.equipo}</p>
        </div>

        <div className="col-span-2">
          <p className="text-slate-500 text-sm">Problema reportado:</p>
          <p>{data.problema}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Fotos de Ingreso</h3>

        <div className="flex gap-4">
          {data.fotosIngreso.map((foto, i) => (
            <div
              key={i}
              className="w-32 h-32 bg-slate-100 rounded-lg flex items-center justify-center border"
            >
              <img
                src={foto}
                alt={`Foto ingreso ${i + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <a
          href={data.reportePdf}
          target="_blank"
          className="px-5 py-2 border rounded-lg text-blue-600 border-blue-600 hover:bg-blue-50"
        >
          Descargar Reporte PDF
        </a>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold mb-4">Historial de Reportes</h3>

        <div className="space-y-4">
          {data.historial.map((item, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-500">
                <span className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getBadgeClass(
                      item.etapa
                    )}`}
                  >
                    {item.etapa}
                  </span>
                  <span>{item.tecnico}</span>
                </span>
                <span>{item.fecha}</span>
              </div>

              <p className="font-medium">{item.titulo}</p>
              <p>{item.detalle}</p>

              {item.acciones && (
                <p className="text-sm text-slate-500">
                  Acciones: {item.acciones}
                </p>
              )}

              {item.documentos && (
                <div>
                  {item.documentos.map((doc, j) => (
                    <a
                      key={j}
                      href={doc.url}
                      target="_blank"
                      className="text-blue-600 text-sm underline block"
                    >
                      {doc.nombre}
                    </a>
                  ))}
                </div>
              )}

              {item.fotos && (
                <div className="flex gap-2 mt-2">
                  {item.fotos.map((f, j) => (
                    <img
                      key={j}
                      src={f}
                      className="w-20 h-20 object-contain border rounded"
                      alt={`foto-${j}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}