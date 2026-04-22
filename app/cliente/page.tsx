"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ClienteLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    setError("");
    router.push("/cliente/portal");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md bg-white/5 p-8 rounded-2xl border border-white/10">
        
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
    type={showPassword ? "text" : "password"}
    placeholder="Contraseña"
    className="p-3 rounded-lg bg-white/10 outline-none w-full pr-10"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />
  <div style={{ marginTop: 8, textAlign: "right" }}>
  <a
    href="/cliente/recuperar"
    style={{
      fontSize: 12,
      color: "#94a3b8",
      textDecoration: "underline",
      cursor: "pointer"
    }}
  >
    Olvidé mi contraseña
  </a>
</div>

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-white"
  >
    {showPassword ? "Ocultar" : "Ver"}
  </button>
</div>

          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 p-3 rounded-lg font-semibold"
          >
            Ingresar
          </button>
          {error && (
  <p className="text-red-400 text-sm text-center">
    {error}
  </p>
)}

       

        </form>
      </div>
    </main>
  );
}