"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NuevaVentaPage() {
  const router = useRouter();

  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState("Cotizada");

  const [factura, setFactura] = useState<File | null>(null);
  const [ordenCompra, setOrdenCompra] = useState<File | null>(null);
  const [fichaTecnica, setFichaTecnica] = useState<File | null>(null);
  const [manual, setManual] = useState<File | null>(null);
  const [certificado, setCertificado] = useState<File | null>(null);

  function guardarVenta() {
    alert(
      "Venta creada.\n\nLuego conectaremos Supabase y PDFs reales."
    );

    router.push("/dashboard/ventas");
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Nueva Venta
        </h1>

        <p className="mt-2 text-slate-500">
          Ingreso de venta y documentos del cliente.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <Campo
            label="Cliente"
            value={cliente}
            onChange={setCliente}
          />

          <Campo
            label="Producto"
            value={producto}
            onChange={setProducto}
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block font-medium">
            Descripción
          </label>

          <textarea
            value={descripcion}
            onChange={(e) =>
              setDescripcion(e.target.value)
            }
            rows={4}
            className="w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-5">
          <label className="mb-2 block font-medium">
            Estado
          </label>

          <select
            value={estado}
            onChange={(e) =>
              setEstado(e.target.value)
            }
            className="w-full rounded-xl border border-slate-200 p-4"
          >
            <option>Cotizada</option>
            <option>Pendiente</option>
            <option>Despachada</option>
            <option>Entregada</option>
          </select>
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            PDFs del producto
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <InputPDF
              label="Factura PDF"
              onChange={setFactura}
            />

            <InputPDF
              label="Orden de Compra PDF"
              onChange={setOrdenCompra}
            />

            <InputPDF
              label="Ficha Técnica PDF"
              onChange={setFichaTecnica}
            />

            <InputPDF
              label="Manual de Operaciones PDF"
              onChange={setManual}
            />

            <InputPDF
              label="Certificado PDF"
              onChange={setCertificado}
            />
          </div>
        </div>

        <button
          onClick={guardarVenta}
          className="mt-8 w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700"
        >
          Guardar venta
        </button>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block font-medium">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
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
      <label className="mb-2 block font-medium">
        {label}
      </label>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) =>
          onChange(
            e.target.files?.[0] || null
          )
        }
        className="w-full rounded-xl border border-slate-200 p-3"
      />
    </div>
  );
}