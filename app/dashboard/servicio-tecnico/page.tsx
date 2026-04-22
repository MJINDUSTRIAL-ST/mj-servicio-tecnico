"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: string;
  prioridad: string;
  created_at: string;
};

export default function ServicioTecnico() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/personal");
        return;
      }

      const email = sessionData.session.user.email;

      if (email !== "personal@mjindustrial.cl") {
        router.push("/personal");
        return;
      }

      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setOrdenes(data || []);
      }
    };

    checkAuthAndFetch();
  }, [router]);

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Órdenes</h1>

        <a href="/dashboard/servicio-tecnico/nueva">
          <button
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Nueva Orden
          </button>
        </a>
      </div>

      {ordenes.map((orden) => (
        <div
          key={orden.id}
          onClick={() => {
            window.location.href = `/dashboard/servicio-tecnico/${orden.id}`;
          }}
          style={{
            marginBottom: 16,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 10,
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          <strong>{orden.codigo}</strong>
          <p>{orden.cliente}</p>
          <p>{orden.equipo}</p>
          <p>{orden.estado}</p>
          <p>{orden.prioridad}</p>
        </div>
      ))}
    </div>
  );
}