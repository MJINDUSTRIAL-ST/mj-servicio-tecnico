type CompraDetalle = {
  numero: string;
  producto: string;
  descripcion: string;
  estado: string;
  factura: string;
  ordenCompra: string;
  fichaTecnica: string;
  manual: string;
  certificadoPdf: string;
  certificado: {
    fecha: string;
    vencimiento: string;
  };
};

const compras: Record<string, CompraDetalle> = {
  "VTA-20260409-003": {
    numero: "VTA-20260409-003",
    producto: "mesa elevadora 500kg",
    descripcion: "Despacho a Antofagasta",
    estado: "Cotizada",
    factura: "/docs/factura-vta-20260409-003.pdf",
    ordenCompra: "/docs/orden-compra-vta-20260409-003.pdf",
    fichaTecnica: "/docs/ficha-tecnica-mesa-elevadora-500kg.pdf",
    manual: "/docs/manual-mesa-elevadora-500kg.pdf",
    certificadoPdf: "/docs/certificado-vta-20260409-003.pdf",
    certificado: {
      fecha: "13/04/2026",
      vencimiento: "13/10/2026",
    },
  },
  "VTA-20260409-002": {
    numero: "VTA-20260409-002",
    producto: "mesa elevadora 500kg",
    descripcion: "Despacho a Antofagasta",
    estado: "Pendiente",
    factura: "/docs/factura-vta-20260409-002.pdf",
    ordenCompra: "/docs/orden-compra-vta-20260409-002.pdf",
    fichaTecnica: "/docs/ficha-tecnica-mesa-elevadora-500kg.pdf",
    manual: "/docs/manual-mesa-elevadora-500kg.pdf",
    certificadoPdf: "/docs/certificado-vta-20260409-002.pdf",
    certificado: {
      fecha: "08/03/2026",
      vencimiento: "08/07/2026",
    },
  },
  "VTA-20260409-001": {
    numero: "VTA-20260409-001",
    producto: "tecle manual 5ton",
    descripcion: "5m cadena mando + 5m cadena carga",
    estado: "Completada",
    factura: "/docs/factura-vta-20260409-001.pdf",
    ordenCompra: "/docs/orden-compra-vta-20260409-001.pdf",
    fichaTecnica: "/docs/ficha-tecnica-tecle-manual-5ton.pdf",
    manual: "/docs/manual-tecle-manual-5ton.pdf",
    certificadoPdf: "/docs/certificado-vta-20260409-001.pdf",
    certificado: {
      fecha: "06/03/2026",
      vencimiento: "06/09/2026",
    },
  },
};

export default async function DetalleCompraPage({
  params,
}: {
  params: Promise<{ venta: string }>;
}) {
  const { venta } = await params;
  const compra = compras[venta];

  if (!compra) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Compra no encontrada</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {compra.numero}
            </h1>
            <p className="mt-3 text-2xl font-semibold">{compra.producto}</p>
            <p className="mt-2 text-slate-500">{compra.descripcion}</p>
          </div>

          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {compra.estado}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <DocumentoButton href={compra.factura} label="Factura" />
          <DocumentoButton href={compra.ordenCompra} label="Orden de Compra" />
          <DocumentoButton href={compra.fichaTecnica} label="Ficha Técnica" />
          <DocumentoButton href={compra.manual} label="Manual de Operaciones" />
          <DocumentoButton href={compra.certificadoPdf} label="Certificado" />
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-blue-600">🏅 Certificado</p>

          <div className="mt-2 text-sm text-slate-600">
            <p>📅 Fecha test: {compra.certificado.fecha}</p>
            <p className="mt-1">
              📅 Vencimiento: {compra.certificado.vencimiento}
            </p>
          </div>

          <a
            href={compra.certificadoPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ver certificado PDF
          </a>
        </div>
      </div>
    </div>
  );
}

function DocumentoButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
    >
      📄 {label}
    </a>
  );
}