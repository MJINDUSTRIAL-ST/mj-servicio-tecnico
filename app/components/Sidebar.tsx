"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const items = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Clientes", href: "/dashboard/clientes" },
    { label: "Empresas", href: "/dashboard/empresas" },
    { label: "Servicio Técnico", href: "/dashboard/servicio-tecnico" },
    { label: "Ventas", href: "/dashboard/ventas" },
    { label: "Logística", href: "/dashboard/logistica" },
    { label: "Administración", href: "/dashboard/administracion" },
    { label: "Cambiar contraseña", href: "/dashboard/cambiar-contrasena" },
  ];

  const itemStyle = (label: string): React.CSSProperties => ({
    textDecoration: "none",
    backgroundColor: hovered === label ? "#1f2937" : "transparent",
    color: hovered === label ? "#ffffff" : "rgba(255,255,255,0.76)",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    display: "block",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap",
  });

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/personal");
  }

  return (
    <>
      <button
        type="button"
        className="menu-button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {open ? (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      ) : null}

      <aside className={open ? "sidebar-drawer open" : "sidebar-drawer"}>
        <div>
          <div className="sidebar-header">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <img src="/logo-mj.png" alt="MJ Industrial" className="logo" />
            </Link>

            <button
              type="button"
              className="close-menu-button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              ×
            </button>
          </div>

          <nav className="nav">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={itemStyle(item.label)}
                onMouseEnter={() => setHovered(item.label)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <button type="button" onClick={cerrarSesion} className="logout">
          Cerrar sesión
        </button>
      </aside>

      <style jsx global>{`
        .menu-button {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 120;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 12px;
          background: #111827;
          color: #ffffff;
          cursor: pointer;
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.24);
        }

        .menu-button:hover {
          background: #1f2937;
        }

        .sidebar-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0, 0, 0, 0.42);
        }

        .sidebar-drawer {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 110;
          width: 240px;
          max-width: 82vw;
          background: #000000;
          color: #ffffff;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 18px 14px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transform: translateX(-100%);
          transition: transform 0.22s ease;
          box-shadow: 12px 0 28px rgba(15, 23, 42, 0.28);
        }

        .sidebar-drawer.open {
          transform: translateX(0);
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 8px 0 28px;
        }

        .logo {
          width: 132px;
          height: auto;
          display: block;
        }

        .close-menu-button {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .logout {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.76);
          padding: 13px 14px;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
        }

        .logout:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        @media (max-width: 600px) {
          .menu-button {
            top: 12px;
            left: 12px;
            width: 42px;
            height: 42px;
          }

          .sidebar-drawer {
            width: 230px;
          }
        }
      `}</style>
    </>
  );
}