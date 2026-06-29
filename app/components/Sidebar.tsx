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
    { label: "Servicio Técnico", href: "/dashboard/servicio-tecnico" },
    { label: "Ventas", href: "/dashboard/ventas" },
    { label: "Logística", href: "/dashboard/logistica" },
    { label: "Administración", href: "/dashboard/administracion" },
  ];

  const itemStyle = (label: string): React.CSSProperties => ({
    textDecoration: "none",
    backgroundColor: hovered === label ? "#1f2937" : "transparent",
    color: hovered === label ? "#ffffff" : "rgba(255,255,255,0.72)",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    display: "block",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap",
  });

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setOpen(true)}>
        Menú
      </button>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <aside
  style={{
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    width: 180,
    background: "#000000",
    color: "#fff",
    borderRight: "1px solid rgba(255,255,255,.05)",
    padding: "18px 14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: ".25s",
    zIndex: 100,
  }}
>
        <div>
          <div className="logo-wrap">
            <Link href="/dashboard">
              <img src="/logo-mj.png" alt="MJ Industrial" className="logo" />
            </Link>
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

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/personal");
          }}
          className="logout"
        >
          Cerrar sesión
        </button>
      </aside>

      <style jsx global>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 180px;
          background: #000;
          border-right: 1px solid rgba(255,255,255,0.08);
          padding: 20px 14px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          z-index: 50;
        }

        .logo-wrap {
          margin: 10px 0 38px;
          display: flex;
          justify-content: center;
        }

        .logo {
          width: 120px;
          height: auto;
          display: block;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .logout {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.72);
          padding: 13px 14px;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
        }

        .mobile-menu-btn {
          display: none;
        }

        .sidebar-backdrop {
          display: none;
        }

        @media (max-width: 900px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-menu-btn {
            display: block;
            position: fixed;
            top: 14px;
            left: 14px;
            z-index: 60;
            background: #111827;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 14px;
            font-weight: 700;
          }

          .sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.35);
            z-index: 40;
          }
        }
      `}</style>
    </>
  );
}