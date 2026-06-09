"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ClienteLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMensajeRecuperacion("");

    const emailLimpio = email.trim().toLowerCase();
    const codigoLimpio = password.trim();

    if (!emailLimpio || !codigoLimpio) {
      setError("Completa todos los campos");
      return;
    }

    setCargando(true);

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("email", emailLimpio)
      .eq("codigo_acceso", codigoLimpio)
      .limit(1);

    setCargando(false);

    if (error) {
      console.error(error);
      setError("Error al validar el acceso");
      return;
    }

    if (!data || data.length === 0) {
      setError("Correo o contraseña incorrectos");
      return;
    }

    const cliente = data[0];

    localStorage.setItem("cliente_id", cliente.id);
    localStorage.setItem("cliente_email", cliente.email || emailLimpio);
    localStorage.setItem("cliente_nombre", cliente.nombre || "");

    router.push("/cliente/portal");
  };

  async function recuperarCodigo() {
    setError("");
    setMensajeRecuperacion("");

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio) {
      setMensajeRecuperacion("Ingresa tu correo electrónico primero.");
      return;
    }

    try {
      setRecuperando(true);

      const response = await fetch("/api/recuperar-codigo-cliente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailLimpio,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error recuperando acceso");
      }

      setMensajeRecuperacion(
        "Si el correo existe, hemos enviado el código de acceso."
      );
    } catch (error) {
      console.error(error);
      setMensajeRecuperacion("Ocurrió un error al enviar el correo.");
    } finally {
      setRecuperando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020b2d] text-white px-4">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-white/10">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-4 text-sm text-white/70 hover:text-white"
        >
          ← Volver al inicio
        </button>

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
              type={mostrarPassword ? "text" : "password"}
              placeholder="Código de acceso"
              className="p-3 rounded-lg bg-white/10 outline-none w-full pr-24"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 text-sm"
            >
              {mostrarPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="bg-orange-500 hover:bg-orange-600 p-3 rounded-lg font-semibold disabled:opacity-60"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>

          <button
            type="button"
            onClick={recuperarCodigo}
            disabled={recuperando}
            className="text-sm text-orange-400 hover:text-orange-300 disabled:opacity-60"
          >
            {recuperando
              ? "Enviando..."
              : "¿Olvidaste tu código de acceso?"}
          </button>

          {error && <p className="text-red-400 text-center">{error}</p>}

          {mensajeRecuperacion && (
            <p className="text-green-400 text-center text-sm">
              {mensajeRecuperacion}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}