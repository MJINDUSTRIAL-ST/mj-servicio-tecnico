"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Cliente = {
  id: string;
  nombre: string;
  rut: string | null;
  telefono: string;
  email: string | null;
  empresa: string | null;
  direccion: string | null;
  codigo_acceso: string;
  created_at: string;
};

type FormData = {
  nombre: string;
  rut: string;
  telefono: string;
  email: string;
  empresa: string;
  direccion: string;
};

function generarCodigoAcceso(nombre: string, empresa: string) {
  const base = (empresa || nombre || "CLIENTE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  const numero = Math.floor(1000 + Math.random() * 9000);
  return `${base}${numero}`;
}

export default function ClientesPage() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>({
    nombre: "",
    rut: "",
    telefono: "",
    email: "",
    empresa: "",
    direccion: "",
  });

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setClientes(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
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

      await cargarClientes();
    };

    checkAuth();
  }, [router]);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return clientes;

    return clientes.filter((cliente) => {
      return (
        String(cliente.nombre || "").toLowerCase().includes(q) ||
        String(cliente.telefono || "").toLowerCase().includes(q) ||
        String(cliente.rut || "").toLowerCase().includes(q) ||
        String(cliente.email || "").toLowerCase().includes(q) ||
        String(cliente.empresa || "").toLowerCase().includes(q) ||
        String(cliente.codigo_acceso || "").toLowerCase().includes(q)
      );
    });
  }, [clientes, busqueda]);

  const resetForm = () => {
    setForm({
      nombre: "",
      rut: "",
      telefono: "",
      email: "",
      empresa: "",
      direccion: "",
    });
    setError("");
  };

  const abrirModal = () => {
    resetForm();
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setError("");
  };

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError("Nombre y teléfono son obligatorios");
      return;
    }

    setGuardando(true);
    setError("");

    const codigo_acceso = generarCodigoAcceso(form.nombre, form.empresa);

    const { error } = await supabase.from("clientes").insert([
      {
        nombre: form.nombre.trim(),
        rut: form.rut.trim() || null,
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        empresa: form.empresa.trim() || null,
        direccion: form.direccion.trim() || null,
        codigo_acceso,
      },
    ]);

    if (error) {
      setError("No se pudo crear el cliente");
      setGuardando(false);
      return;
    }

    await cargarClientes();
    setGuardando(false);
    cerrarModal();
  };

  const handleEliminarCliente = async (id: string) => {
    const confirmar = window.confirm("¿Eliminar este cliente?");
    if (!confirmar) return;

    const { error } = await supabase.from("clientes").delete().eq("id", id);

    if (!error) {
      await cargarClientes();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
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
          zIndex: 20,
        }}
      >
        <div>
          <div style={{ marginBottom: 28, padding: "6px 8px" }}>
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
                style={{
                  height: 26,
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <a
              href="/dashboard/servicio-tecnico"
              style={{
                textDecoration: "none",
                color: "#cbd5e1",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Dashboard
            </a>

            <a
              href="/dashboard/clientes"
              style={{
                textDecoration: "none",
                backgroundColor: "#2563eb",
                color: "white",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Clientes
            </a>

            <a
              href="/dashboard/servicio-tecnico"
              style={{
                textDecoration: "none",
                color: "#cbd5e1",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Servicio Técnico
            </a>

            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#cbd5e1",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                textAlign: "left",
                cursor: "default",
              }}
            >
              Ventas
            </button>
          </div>
        </div>

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

      <main
        style={{
          marginLeft: 250,
          minHeight: "100vh",
          padding: 28,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                color: "#111827",
              }}
            >
              Clientes
            </h1>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              {clientes.length} clientes registrados
            </p>
          </div>

          <button
            onClick={abrirModal}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "12px 18px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
              boxShadow: "0 10px 20px rgba(37,99,235,0.18)",
            }}
          >
            + Nuevo Cliente
          </button>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: 18,
            border: "1px solid #e5e7eb",
            padding: 18,
          }}
        >
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, RUT..."
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              marginBottom: 18,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />

          {loading ? (
            <p style={{ color: "#6b7280" }}>Cargando clientes...</p>
          ) : clientesFiltrados.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No hay clientes para mostrar.</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {clientesFiltrados.map((cliente) => (
                <div
                  key={cliente.id}
                  style={{
                    border: "1px solid #eef2f7",
                    backgroundColor: "#fbfdff",
                    borderRadius: 16,
                    padding: 18,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 18,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#111827",
                        marginBottom: 10,
                      }}
                    >
                      {cliente.nombre}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                        color: "#4b5563",
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      <span>{cliente.telefono}</span>
                      <span>{cliente.email || "-"}</span>
                      <span>RUT: {cliente.rut || "-"}</span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        flexWrap: "wrap",
                        color: "#6b7280",
                        fontSize: 14,
                        marginBottom: 6,
                      }}
                    >
                      <span>{cliente.empresa || "-"}</span>
                      <span>{cliente.direccion || "-"}</span>
                    </div>

                    <div
                      style={{
                        color: "#111827",
                        fontSize: 14,
                        fontWeight: 600,
                        marginTop: 8,
                      }}
                    >
                      Código acceso: {cliente.codigo_acceso}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => handleEliminarCliente(cliente.id)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalAbierto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              backgroundColor: "white",
              borderRadius: 18,
              padding: 24,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 28,
                  color: "#111827",
                }}
              >
                Nuevo Cliente
              </h2>

              <button
                onClick={cerrarModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCrearCliente}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Nombre *
                  </label>
                  <input
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    placeholder="Nombre completo"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    RUT / ID
                  </label>
                  <input
                    value={form.rut}
                    onChange={(e) => setForm({ ...form, rut: e.target.value })}
                    placeholder="12.345.678-9"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Teléfono *
                  </label>
                  <input
                    value={form.telefono}
                    onChange={(e) =>
                      setForm({ ...form, telefono: e.target.value })
                    }
                    placeholder="+56 9 1234 5678"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Empresa
                  </label>
                  <input
                    value={form.empresa}
                    onChange={(e) =>
                      setForm({ ...form, empresa: e.target.value })
                    }
                    placeholder="Empresa"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 14,
                      color: "#111827",
                      fontWeight: 600,
                    }}
                  >
                    Dirección
                  </label>
                  <input
                    value={form.direccion}
                    onChange={(e) =>
                      setForm({ ...form, direccion: e.target.value })
                    }
                    placeholder="Dirección"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #d1d5db",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  color: "#6b7280",
                  fontSize: 14,
                }}
              >
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  Código de Acceso (para consultar órdenes)
                </div>
                <div style={{ marginTop: 6 }}>
                  Se genera automáticamente
                </div>
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  El cliente usa este código para ver sus órdenes en el portal.
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 16,
                    color: "#dc2626",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  marginTop: 22,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                }}
              >
                <button
                  type="button"
                  onClick={cerrarModal}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 18px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 14,
                    opacity: guardando ? 0.7 : 1,
                  }}
                >
                  {guardando ? "Creando..." : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}