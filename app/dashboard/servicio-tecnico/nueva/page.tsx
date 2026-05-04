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

export default function NuevaOrden() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [equipo, setEquipo] = useState("");
  const [estado, setEstado] = useState("Ingreso");
  const [prioridad, setPrioridad] = useState("Media");

  useEffect(() => {
    const cargarClientes = async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre, email, empresa")
        .order("nombre", { ascending: true });

      if (!error) {
        setClientes(data || []);
      }
    };

    cargarClientes();
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
          placeholder="Código (ej: OT-004)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          required
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
          style={{
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            padding: 10,
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Guardar Orden
        </button>
      </form>
    </div>
  );
}