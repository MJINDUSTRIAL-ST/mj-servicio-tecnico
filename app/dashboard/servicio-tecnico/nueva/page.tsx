"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function NuevaOrden() {
  const router = useRouter();

  const [codigo, setCodigo] = useState("");
  const [cliente, setCliente] = useState("");
  const [equipo, setEquipo] = useState("");
  const [estado, setEstado] = useState("Ingreso");
  const [prioridad, setPrioridad] = useState("Media");

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const { error } = await supabase.from("ordenes").insert([
      {
        codigo,
        cliente,
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
          maxWidth: 400,
        }}
      >
        <input
          placeholder="Código (ej: OT-004)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          required
        />

        <input
          placeholder="Cliente"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          required
        />

        <input
          placeholder="Equipo"
          value={equipo}
          onChange={(e) => setEquipo(e.target.value)}
          required
        />

        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option>Ingreso</option>
          <option>Reparación</option>
          <option>Listo</option>
        </select>

        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
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
          }}
        >
          Guardar Orden
        </button>
      </form>
    </div>
  );
}