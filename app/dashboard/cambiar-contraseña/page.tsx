"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function CambiarContrasenaPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [email, setEmail] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function verificarSesion() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/personal");
        return;
      }

      setEmail(user.email ?? "");
      setLoading(false);
    }

    void verificarSesion();
  }, [router]);

  async function guardarContrasena(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMensaje("");
    setError("");

    const nueva = nuevaContrasena.trim();
    const confirmar = confirmarContrasena.trim();

    if (!nueva) {
      setError("Debes ingresar una nueva contraseña.");
      return;
    }

    if (nueva.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setGuardando(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: nueva,
      });

      if (updateError) {
        throw updateError;
      }

      setNuevaContrasena("");
      setConfirmarContrasena("");

      setMensaje("Contraseña actualizada correctamente.");
    } catch (updateError) {
      console.error(updateError);

      setError(
        updateError instanceof Error
          ? updateError.message
          : "No fue posible actualizar la contraseña.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.loader} />
          <p style={styles.loadingText}>Verificando sesión...</p>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={styles.backButton}
        >
          ← Volver al Dashboard
        </button>

        <div style={styles.header}>
          <span style={styles.label}>SEGURIDAD</span>

          <h1 style={styles.title}>Cambiar contraseña</h1>

          <p style={styles.description}>
            Ingresa una nueva contraseña para tu acceso interno al sistema
            MJ Industrial.
          </p>
        </div>

        <div style={styles.userBox}>
          <span style={styles.userLabel}>Sesión iniciada como</span>
          <strong style={styles.userEmail}>{email}</strong>
        </div>

        {mensaje ? (
          <div style={styles.successMessage}>{mensaje}</div>
        ) : null}

        {error ? <div style={styles.errorMessage}>{error}</div> : null}

        <form onSubmit={guardarContrasena} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Nueva contraseña</span>

            <input
              type="password"
              value={nuevaContrasena}
              onChange={(event) =>
                setNuevaContrasena(event.target.value)
              }
              placeholder="Mínimo 8 caracteres"
              style={styles.input}
              disabled={guardando}
            />
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Confirmar contraseña</span>

            <input
              type="password"
              value={confirmarContrasena}
              onChange={(event) =>
                setConfirmarContrasena(event.target.value)
              }
              placeholder="Repite la nueva contraseña"
              style={styles.input}
              disabled={guardando}
            />
          </label>

          <button
            type="submit"
            disabled={guardando}
            style={{
              ...styles.primaryButton,
              opacity: guardando ? 0.65 : 1,
              cursor: guardando ? "not-allowed" : "pointer",
            }}
          >
            {guardando ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>

        <p style={styles.helpText}>
          Si olvidaste tu contraseña, solicita a Administración que reinicie tu
          acceso y te envíe una nueva contraseña temporal.
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100%",
    padding: 32,
    background: "#f4f5f7",
    color: "#182230",
  },

  card: {
    maxWidth: 560,
    margin: "56px auto",
    padding: 28,
    borderRadius: 18,
    border: "1px solid #e1e5ea",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(16, 24, 40, 0.06)",
  },

  backButton: {
    marginBottom: 24,
    border: 0,
    background: "transparent",
    color: "#667085",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  },

  header: {
    marginBottom: 22,
  },

  label: {
    display: "block",
    color: "#667085",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
  },

  title: {
    margin: "6px 0 8px",
    color: "#182230",
    fontSize: 30,
    letterSpacing: -0.6,
    lineHeight: 1.15,
  },

  description: {
    margin: 0,
    color: "#667085",
    fontSize: 15,
    lineHeight: 1.55,
  },

  userBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  userLabel: {
    display: "block",
    marginBottom: 4,
    color: "#667085",
    fontSize: 12,
    fontWeight: 700,
  },

  userEmail: {
    color: "#182230",
    fontSize: 14,
  },

  successMessage: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #abefc6",
    background: "#ecfdf3",
    color: "#067647",
    fontSize: 14,
    fontWeight: 700,
  },

  errorMessage: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #fecdca",
    background: "#fef3f2",
    color: "#b42318",
    fontSize: 14,
    fontWeight: 700,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  fieldLabel: {
    color: "#344054",
    fontSize: 13,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    minHeight: 44,
    padding: "0 13px",
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#182230",
    fontSize: 14,
    boxSizing: "border-box",
  },

  primaryButton: {
    minHeight: 44,
    border: 0,
    borderRadius: 10,
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
  },

  helpText: {
    margin: "18px 0 0",
    color: "#667085",
    fontSize: 12,
    lineHeight: 1.5,
  },

  loader: {
    width: 24,
    height: 24,
    margin: "0 auto 12px",
    border: "3px solid #dbe4f0",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
  },

  loadingText: {
    margin: 0,
    textAlign: "center",
    color: "#667085",
    fontSize: 14,
    fontWeight: 700,
  },
};