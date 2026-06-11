"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Cliente = {
  id: string;
  nombre: string;
  email: string | null;
  empresa: string | null;
};

export default function NuevaVentaPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");

  const [numero, setNumero] = useState("");
  const [producto, setProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Cotizada");
  const [fechaVenta, setFechaVenta] = useState("");
  const [fechaCertificado, setFechaCertificado] = useState("");
  const [vencimientoCertificado, setVencimientoCertificado] = useState("");

  const [factura, setFactura] = useState<File | null>(null);
  const [ordenCompra, setOrdenCompra] = useState<File | null>(null);
  const [fichaTecnica, setFichaTecnica] = useState<File | null>(null);
  const [manual, setManual] = useState<File | null>(null);
  const [certificado, setCertificado] = useState<File | null>(null);

  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, email, empresa")
        .order("nombre", { ascending: true });

      setClientes(clientesData || []);

      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      const prefijo = `VTA-${yyyy}${mm}${dd}`;

      const { data: ventasData } = await supabase
        .from("ventas")
        .select("numero")
        .like("numero", `${prefijo}-%`);

      let mayorNumero = 0;

      (ventasData || []).forEach((venta) => {
        const partes = String(venta.numero).split("-");
        const ultimo = Number(partes[2]);

        if (!isNaN(ultimo) && ultimo > mayorNumero) {
          mayorNumero = ultimo;
        }
      });

      const siguienteNumero = mayorNumero + 1;
      setNumero(`${prefijo}-${String(siguienteNumero).padStart(3, "0")}`);
    };

    cargarDatos();
  }, []);

async function subirPDF(file: File | null, tipo: string) {
  if (!file) return null;

  const nombreLimpio = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  const numeroLimpio = numero
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  const tipoLimpio = tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  const ruta = `${numeroLimpio}/${tipoLimpio}-${Date.now()}-${nombreLimpio}`;

  const { error } = await supabase.storage.from("ventas").upload(ruta, file, {
    upsert: true,
    contentType: "application/pdf",
  });

  if (error) {
    throw new Error(`Error subiendo ${tipo}: ${error.message}`);
  }

  const { data } = supabase.storage.from("ventas").getPublicUrl(ruta);

  return data.publicUrl;
}

  async function guardarVenta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

    if (!clienteSeleccionado) {
      alert("Selecciona un cliente");
      return;
    }

    if (!clienteSeleccionado.email) {
      alert("El cliente no tiene email registrado");
      return;
    }

    if (!producto) {
      alert("Completa el producto");
      return;
    }

    setGuardando(true);

    try {
      const facturaUrl = await subirPDF(factura, "factura");
      const ordenCompraUrl = await subirPDF(ordenCompra, "orden-compra");
      const fichaTecnicaUrl = await subirPDF(fichaTecnica, "ficha-tecnica");
      const manualUrl = await subirPDF(manual, "manual");
      const certificadoUrl = await subirPDF(certificado, "certificado");

      const { error } = await supabase.from("ventas").insert([
        {
          numero,
          cliente: clienteSeleccionado.nombre,
          cliente_email: clienteSeleccionado.email.trim().toLowerCase(),
          producto,
          descripcion,
          estado,
          fecha_venta: fechaVenta || new Date().toISOString().slice(0, 10),
          fecha_certificado: fechaCertificado || null,
          vencimiento_certificado: vencimientoCertificado || null,
          factura_url: facturaUrl,
          orden_compra_url: ordenCompraUrl,
          ficha_tecnica_url: fichaTecnicaUrl,
          manual_url: manualUrl,
          certificado_url: certificadoUrl,
        },
      ]);

      if (error) {
        throw new Error("Error guardando venta: " + error.message);
      }

      router.push("/dashboard/ventas");
    } catch (error: any) {
      alert(error.message || "No se pudo guardar la venta");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 text-sm text-slate-500 hover:text-slate-900"
      >
        ← Volver
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nueva Venta</h1>
        <p className="mt-2 text-slate-500">
          Ingreso de venta y documentos reales del cliente.
        </p>
      </div>

      <form onSubmit={guardarVenta} className="space-y-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Cliente</h2>

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 p-4"
          >
            <option value="">Seleccionar cliente...</option>

            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
                {cliente.empresa ? ` — ${cliente.empresa}` : ""}
                {cliente.email ? ` (${cliente.email})` : ""}
              </option>
            ))}
          </select>

          {clientes.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              No hay clientes. Crear uno primero.
            </p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Datos de la venta</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <Campo
              label="Número de venta"
              value={numero}
              onChange={setNumero}
              readOnly
            />

            <Campo
              label="Fecha venta"
              value={fechaVenta}
              onChange={setFechaVenta}
              type="date"
            />

            <Campo label="Producto" value={producto} onChange={setProducto} />

            <div>
              <label className="mb-2 block font-medium">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-4"
              >
                <option>Cotizada</option>
                <option>Pendiente</option>
                <option>Despachada</option>
                <option>Entregada</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block font-medium">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-blue-500"
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Certificado</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <Campo
              label="Fecha test"
              value={fechaCertificado}
              onChange={setFechaCertificado}
              type="date"
            />

            <Campo
              label="Vencimiento certificado"
              value={vencimientoCertificado}
              onChange={setVencimientoCertificado}
              type="date"
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">PDFs del producto</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <InputPDF label="Factura PDF" onChange={setFactura} />
            <InputPDF label="Orden de Compra PDF" onChange={setOrdenCompra} />
            <InputPDF label="Ficha Técnica PDF" onChange={setFichaTecnica} />
            <InputPDF label="Manual de Operaciones PDF" onChange={setManual} />
            <InputPDF label="Certificado PDF" onChange={setCertificado} />
          </div>
        </section>

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {guardando ? "Guardando venta..." : "Guardar venta"}
        </button>
      </form>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium">{label}</label>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-blue-500 ${
          readOnly ? "bg-slate-100 text-slate-500" : ""
        }`}
      />
    </div>
  );
}

function InputPDF({
  label,
  onChange,
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium">{label}</label>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="w-full rounded-xl border border-slate-200 p-3"
      />
    </div>
  );
}