"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type Cliente = {
  id: string;
  nombre: string;
  email: string | null;
  empresa: string | null;
};

export default function NuevaOrden() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [estado, setEstado] = useState("Ingreso");
  const [prioridad, setPrioridad] = useState("Media");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, email, empresa")
        .order("nombre", { ascending: true });

      setClientes(clientesData || []);

      const { data: ultimaOrden } = await supabase
        .from("ordenes")
        .select("codigo")
        .like("codigo", "OT-%")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let siguienteNumero = 1;

      if (ultimaOrden?.codigo) {
        const numeroActual = parseInt(
          ultimaOrden.codigo.replace("OT-", ""),
          10
        );

        if (!isNaN(numeroActual)) {
          siguienteNumero = numeroActual + 1;
        }
      }

      const nuevoCodigo = `OT-${String(siguienteNumero).padStart(3, "0")}`;
      setCodigo(nuevoCodigo);
    };

    cargarDatos();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const clienteSeleccionado = clientes.find(
      (cliente) => cliente.id === clienteId
    );

    if (!clienteSeleccionado) {
      alert("Selecciona un cliente");
      return;
    }

    if (!clienteSeleccionado.email) {
      alert("Este cliente no tiene email registrado");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.from("ordenes").insert([
      {
        codigo,
        cliente: clienteSeleccionado.nombre,
        cliente_email: clienteSeleccionado.email,
        equipo,
        estado,
        prioridad,
      },
    ]);

    setGuardando(false);

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    router.push("/dashboard/servicio-tecnico");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Nueva Orden</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 420,
        }}
      >
        <input
          placeholder="Código"
          value={codigo}
          readOnly
          style={{
            backgroundColor: "#f1f5f9",
            color: "#475569",
            cursor: "not-allowed",
          }}
        />

        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          required
        >
          <option value="">Seleccionar cliente</option>

          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre}
              {cliente.empresa ? ` — ${cliente.empresa}` : ""}
              {cliente.email ? ` (${cliente.email})` : ""}
            </option>
          ))}
        </select>

        <input
          placeholder="Equipo"
          value={equipo}
          onChange={(e) => setEquipo(e.target.value)}
          required
        />

        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option>Ingreso</option>
          <option>Revisión</option>
          <option>Cotización</option>
          <option>Mantenimiento</option>
          <option>Reparación</option>
          <option>Listo</option>
          <option>Listo p/Entrega</option>
          <option>Entregado</option>
        </select>

        <select
          value={prioridad}
          onChange={(e) => setPrioridad(e.target.value)}
        >
          <option>Alta</option>
          <option>Media</option>
          <option>Baja</option>
        </select>

        <button
          type="submit"
          disabled={guardando}
          style={{
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            padding: 10,
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
            opacity: guardando ? 0.6 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar Orden"}
        </button>
      </form>
    </div>
  );
}