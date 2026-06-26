"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Sidebar() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const getItemStyle = (key: string): React.CSSProperties => {
    const isHover = hovered === key;

    return {
      textDecoration: "none",
      backgroundColor: isHover ? "#2563eb" : "transparent",
      color: isHover ? "white" : "rgba(255,255,255,0.72)",
      padding: "14px 16px",
      borderRadius: 12,
      fontWeight: isHover ? 600 : 500,
      fontSize: 15,
      display: "block",
      transition: "all 0.18s ease",
      cursor: "pointer",
      outline: "none",
    };
  };

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: 260,
        backgroundColor: "#000000",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        color: "white",
        padding: "20px 16px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div
          style={{
            marginTop: 12,
            marginBottom: 42,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Link href="/dashboard" style={{ textDecoration: "none", display: "block" }}>
            <img
              src="/logo-mj.png"
              alt="MJ Industrial"
              style={{
                width: 165,
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/dashboard" style={getItemStyle("dashboard")} onMouseEnter={() => setHovered("dashboard")} onMouseLeave={() => setHovered(null)} onFocus={(e) => e.target.blur()}>
            📊 Dashboard
          </Link>

          <Link href="/dashboard/clientes" style={getItemStyle("clientes")} onMouseEnter={() => setHovered("clientes")} onMouseLeave={() => setHovered(null)} onFocus={(e) => e.target.blur()}>
            👥 Clientes
          </Link>

          <Link href="/dashboard/servicio-tecnico" style={getItemStyle("servicio")} onMouseEnter={() => setHovered("servicio")} onMouseLeave={() => setHovered(null)} onFocus={(e) => e.target.blur()}>
            🔧 Servicio Técnico
          </Link>

          <Link href="/dashboard/ventas" style={getItemStyle("ventas")} onMouseEnter={() => setHovered("ventas")} onMouseLeave={() => setHovered(null)} onFocus={(e) => e.target.blur()}>
            💰 Ventas
          </Link>

          <Link href="/dashboard/logistica" style={getItemStyle("logistica")} onMouseEnter={() => setHovered("logistica")} onMouseLeave={() => setHovered(null)} onFocus={(e) => e.target.blur()}>
            🚚 Logística
          </Link>

          <Link href="/dashboard/administracion" style={getItemStyle("admin")} onMouseEnter={() => setHovered("admin")} onMouseLeave={() => setHovered(null)} onFocus={(e) => e.target.blur()}>
            ⚙ Administración
          </Link>
        </div>
      </div>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/personal");
        }}
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.72)",
          padding: "14px 16px",
          borderRadius: 12,
          cursor: "pointer",
          textAlign: "left",
          fontSize: 14,
          transition: "all 0.2s ease",
        }}
      >
        Cerrar sesión
      </button>
    </aside>
  );
}