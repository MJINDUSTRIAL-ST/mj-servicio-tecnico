"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

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

export default function ClienteLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [codigoAcceso, setCodigoAcceso] = useState("");
  const [mostrarCodigo, setMostrarCodigo] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  console.log("LOGIN CLICK");
  console.log("EMAIL:", email);
  console.log("CODIGO:", codigoAcceso);

  if (!email || !codigoAcceso) {
    setError("Completa todos los campos");
    return;
  }

    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .eq("codigo_acceso", codigoAcceso.trim())
      .single();

    setCargando(false);

    if (error || !data) {
      setError("Correo o código de acceso incorrectos");
      return;
    }

    const cliente = data as Cliente;

    localStorage.setItem("cliente_logueado", JSON.stringify(cliente));
    router.push("/cliente/portal");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020b2d] text-white px-4">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-white/10">
        <h2 className="text-2xl font-bold text-center mb-6">
          Portal de Clientes
        </h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            className="p-3 rounded-lg bg-white/10 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <input
              type={mostrarCodigo ? "text" : "password"}
              placeholder="Código de acceso"
              className="p-3 rounded-lg bg-white/10 outline-none w-full pr-24"
              value={codigoAcceso}
              onChange={(e) => setCodigoAcceso(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setMostrarCodigo(!mostrarCodigo)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 text-sm"
            >
              {mostrarCodigo ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <div style={{ marginTop: 8, textAlign: "right" }}>
            <a
              href="/cliente/recuperar"
              style={{
                fontSize: 13,
                color: "#94a3b8",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Olvidé mi código de acceso
            </a>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="bg-orange-500 hover:bg-orange-600 p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>

          {error && <p className="text-red-400 text-center">{error}</p>}
        </form>
      </div>
    </main>
  );
}