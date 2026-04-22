"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold text-orange-400">
            Recuperación de acceso
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {!enviado ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white/10 p-3 outline-none"
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-orange-500 p-3 font-semibold transition hover:bg-orange-600"
            >
              Enviar enlace de recuperación
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
            Si el correo existe en el sistema, te enviaremos un enlace para restablecer tu contraseña.
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/cliente" className="text-sm text-slate-400 hover:text-white">
            Volver al login
          </Link>
        </div>
      </div>
    </main>
  );
}