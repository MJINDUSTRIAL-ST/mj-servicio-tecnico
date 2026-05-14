"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type PdfKey =
  | "factura_url"
  | "orden_compra_url"
  | "ficha_tecnica_url"
  | "manual_url"
  | "certificado_url";

export default function NuevaVentaPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
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

  async function generarNumeroVenta() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const prefijo = `VTA-${yyyy}${mm}${dd}`;

    const { data, error } = await supabase
      .from("ventas")
      .select("numero")
      .ilike("numero", `${prefijo}-%`);

    if (error) {
      throw new Error("No se pudo generar el número de venta: " + error.message);
    }

    const correlativo = String((data?.length || 0) + 1).padStart(3, "0");
    return `${prefijo}-${correlativo}`;
  }

  async function subirPDF(file: File | null, numero: string, tipo: string) {
    if (!file) return null;

    const nombreLimpio = file.name
      .toLowerCase()
      .replaceAll(" ", "-")
      .replaceAll("/", "-");

    const ruta = `${numero}/${tipo}-${Date.now()}-${nombreLimpio}`;

    const { error } = await supabase.storage
      .from("ventas")
      .upload(ruta, file, {
        upsert: true,
        contentType: "application/pdf",
      });

    if (error) {
      throw new Error(`Error subiendo ${tipo}: ${error.message}`);
    }

    const { data } = supabase.storage.from("ventas").getPublicUrl(ruta);
    return data.publicUrl;
  }

  async function guardarVenta() {
    if (!cliente || !clienteEmail || !producto) {
      alert("Completa cliente, email del cliente y producto.");
      return;
    }

    setGuardando(true);

    try {
      const numero = await generarNumeroVenta();

      const facturaUrl = await subirPDF(factura, numero, "factura");
      const ordenCompraUrl = await subirPDF(ordenCompra, numero, "orden-compra");
      const fichaTecnicaUrl = await subirPDF(fichaTecnica, numero, "ficha-tecnica");
      const manualUrl = await subirPDF(manual, numero, "manual");
      const certificadoUrl = await subirPDF(certificado, numero, "certificado");

      const { error } = await supabase.from("ventas").insert([
        {
          numero,
          cliente,
          cliente_email: clienteEmail.trim().toLowerCase(),
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nueva Venta</h1>
        <p className="mt-2 text-slate-500">
          Ingreso de venta y documentos reales del cliente.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <Campo label="Cliente" value={cliente} onChange={setCliente} />
          <Campo label="Email cliente" value={clienteEmail} onChange={setClienteEmail} />
          <Campo label="Producto" value={producto} onChange={setProducto} />
          <Campo label="Fecha venta" value={fechaVenta} onChange={setFechaVenta} type="date" />
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

        <div className="mt-5">
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

        <div className="mt-8">
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
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">PDFs del producto</h2>

          <div className="grid gap-5 md:grid-cols-2">
            <InputPDF label="Factura PDF" onChange={setFactura} />
            <InputPDF label="Orden de Compra PDF" onChange={setOrdenCompra} />
            <InputPDF label="Ficha Técnica PDF" onChange={setFichaTecnica} />
            <InputPDF label="Manual de Operaciones PDF" onChange={setManual} />
            <InputPDF label="Certificado PDF" onChange={setCertificado} />
          </div>
        </div>

        <button
          onClick={guardarVenta}
          disabled={guardando}
          className="mt-8 w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {guardando ? "Guardando venta..." : "Guardar venta"}
        </button>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-blue-500"
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