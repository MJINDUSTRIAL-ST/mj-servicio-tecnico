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
      color: isHover ? "white" : "#cbd5e1",
      padding: "12px 14px",
      borderRadius: 10,
      fontWeight: isHover ? 600 : 500,
      fontSize: 14,
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
        width: 250,
        backgroundColor: "#0f172a",
        color: "white",
        padding: "20px 16px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <Link
            href="/dashboard/servicio-tecnico"
            style={{
              display: "block",
              backgroundColor: "white",
              padding: "10px 12px",
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            <img
              src="/logo-mj.png"
              alt="MJ Industrial"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                objectFit: "contain",
              }}
            />
          </Link>
        </div>

        {/* Menú */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <Link
            href="/dashboard/servicio-tecnico"
            style={getItemStyle("dashboard")}
            onMouseEnter={() => setHovered("dashboard")}
            onMouseLeave={() => setHovered(null)}
            onFocus={(e) => e.target.blur()}
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/clientes"
            style={getItemStyle("clientes")}
            onMouseEnter={() => setHovered("clientes")}
            onMouseLeave={() => setHovered(null)}
            onFocus={(e) => e.target.blur()}
          >
            Clientes
          </Link>

          <Link
            href="/dashboard/servicio-tecnico"
            style={getItemStyle("servicio")}
            onMouseEnter={() => setHovered("servicio")}
            onMouseLeave={() => setHovered(null)}
            onFocus={(e) => e.target.blur()}
          >
            Servicio Técnico
          </Link>

          <Link
            href="/dashboard/ventas"
            style={getItemStyle("ventas")}
            onMouseEnter={() => setHovered("ventas")}
            onMouseLeave={() => setHovered(null)}
            onFocus={(e) => e.target.blur()}
          >
            Ventas
          </Link>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/personal");
        }}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#cbd5e1",
          padding: "12px 14px",
          borderRadius: 10,
          cursor: "pointer",
          textAlign: "left",
          fontSize: 14,
        }}
      >
        Cerrar sesión
      </button>
    </aside>
  );
}