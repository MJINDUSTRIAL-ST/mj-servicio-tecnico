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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }

    setCargando(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    setCargando(false);

    if (error) {
      setError("Correo o contraseña incorrectos");
      return;
    }

    // 🚀 SOLO LOGIN, SIN VALIDAR TABLA clientes
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
              type={mostrarPassword ? "text" : "password"}
              placeholder="Contraseña"
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

          {error && <p className="text-red-400 text-center">{error}</p>}
        </form>
      </div>
    </main>
  );
}