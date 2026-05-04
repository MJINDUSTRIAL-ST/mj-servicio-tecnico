"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function PersonalLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#020b2d] text-white px-4">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-white/10">

        {/* BOTÓN VOLVER */}
        <button
          onClick={() => router.push("/")}
          className="mb-4 text-sm text-white/70 hover:text-white"
        >
          ← Volver al inicio
        </button>

        <h2 className="text-2xl font-bold text-center mb-6">
          Acceso Personal MJ Industrial
        </h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            className="p-3 rounded-lg bg-white/10 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="p-3 rounded-lg bg-white/10 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

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