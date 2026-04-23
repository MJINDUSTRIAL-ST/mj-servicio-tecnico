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
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "inline-block",
              backgroundColor: "white",
              padding: "8px 10px",
              borderRadius: 8,
            }}
          >
            <img
              src="/logo.png"
              alt="MJ Industrial"
              style={{ height: 26 }}
            />
          </div>
        </div>

        {/* Menú */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
            Clientes TEST
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

          <button
            type="button"
            style={{
              ...getItemStyle("ventas"),
              border: "none",
              textAlign: "left",
              width: "100%",
            }}
            onMouseEnter={() => setHovered("ventas")}
            onMouseLeave={() => setHovered(null)}
          >
            Ventas
          </button>
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