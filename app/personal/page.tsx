"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function PersonalLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Completa todos los campos");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Correo o contraseña incorrectos");
      return;
    }

    router.replace("/dashboard/servicio-tecnico");
window.location.href = "/dashboard/servicio-tecnico?refresh=1";
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-2xl border border-white/10">

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
            className="bg-orange-500 hover:bg-orange-600 p-3 rounded-lg font-semibold"
          >
            Ingresar
          </button>

          {error && (
            <p className="text-red-400 text-center">{error}</p>
          )}
        </form>

      </div>
    </main>
  );
}