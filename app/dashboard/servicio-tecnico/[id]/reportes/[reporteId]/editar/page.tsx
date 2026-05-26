"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../../lib/supabase";

type ReporteFoto = {
  id: string;
  reporte_id: string;
  foto_url: string;
  storage_path: string | null;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type FotoNueva = {
  id: string;
  file: File;
  preview: string;
  comentario: string;
};

export default function EditarReportePage() {
  const router = useRouter();
  const params = useParams();

  const ordenId = Array.isArray(params.id) ? params.id[0] : params.id;
  const reporteId = Array.isArray(params.reporteId)
    ? params.reporteId[0]
    : params.reporteId;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [etapa, setEtapa] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [hallazgos, setHallazgos] = useState("");
  const [acciones, setAcciones] = useState("");
  const [costo, setCosto] = useState("");

  const [fotosExistentes, setFotosExistentes] = useState<ReporteFoto[]>([]);
  const [fotosNuevas, setFotosNuevas] = useState<FotoNueva[]>([]);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  async function cargarReporte() {
    const { data, error } = await supabase
      .from("reportes")
      .select("*")
      .eq("id", reporteId)
      .single();

    if (error || !data) {
      alert("No se pudo cargar el reporte");
      router.push(`/dashboard/servicio-tecnico/${ordenId}`);
      return;
    }

    const { data: fotosData, error: errorFotos } = await supabase
      .from("reporte_fotos")
      .select("*")
      .eq("reporte_id", reporteId)
      .order("orden", { ascending: true });

    if (errorFotos) {
      alert("No se pudieron cargar las fotos: " + errorFotos.message);
    }

    setEtapa(data.etapa || "");
    setDescripcion(data.descripcion || "");
    setHallazgos(data.hallazgos || "");
    setAcciones(data.acciones || "");
    setCosto(data.costo?.toString() || "");
    setFotosExistentes((fotosData || []) as ReporteFoto[]);
    setLoading(false);
  }

  function agregarFotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    const nuevas: FotoNueva[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      comentario: "",
    }));

    setFotosNuevas((prev) => [...prev, ...nuevas]);
  }

  function eliminarFotoNueva(idFoto: string) {
    setFotosNuevas((prev) => {
      const foto = prev.find((item) => item.id === idFoto);
      if (foto) URL.revokeObjectURL(foto.preview);
      return prev.filter((item) => item.id !== idFoto);
    });
  }

  async function eliminarFotoExistente(foto: ReporteFoto) {
    const confirmar = window.confirm("¿Eliminar esta foto?");
    if (!confirmar) return;

    if (foto.storage_path) {
      await supabase.storage.from("reportes").remove([foto.storage_path]);
    }

    const { error } = await supabase
      .from("reporte_fotos")
      .delete()
      .eq("id", foto.id);

    if (error) {
      alert("No se pudo eliminar la foto: " + error.message);
      return;
    }

    setFotosExistentes((prev) => prev.filter((item) => item.id !== foto.id));
  }

  function cambiarComentarioFotoNueva(idFoto: string, valor: string) {
    setFotosNuevas((prev) =>
      prev.map((foto) =>
        foto.id === idFoto ? { ...foto, comentario: valor } : foto
      )
    );
  }

  async function comprimirImagen(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 1600;

          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("No se pudo procesar la imagen"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("No se pudo comprimir la imagen"));
                return;
              }

              resolve(blob);
            },
            "image/jpeg",
            0.8
          );
        };

        img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
        img.src = reader.result as string;
      };

      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function guardarCambios() {
    setGuardando(true);

    try {
      const { error } = await supabase
        .from("reportes")
        .update({
          etapa,
          descripcion,
          hallazgos,
          acciones,
          costo: costo ? Number(costo) : null,
        })
        .eq("id", reporteId);

      if (error) throw new Error(error.message);

      for (let i = 0; i < fotosNuevas.length; i++) {
        const foto = fotosNuevas[i];
        const blobComprimido = await comprimirImagen(foto.file);

        const nombreArchivo = `${ordenId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("reportes")
          .upload(nombreArchivo, blobComprimido, {
            upsert: true,
            contentType: "image/jpeg",
          });

        if (uploadError) {
          throw new Error("Error subiendo foto: " + uploadError.message);
        }

        const { data: publicData } = supabase.storage
          .from("reportes")
          .getPublicUrl(nombreArchivo);

        const { error: insertFotoError } = await supabase
          .from("reporte_fotos")
          .insert([
            {
              reporte_id: reporteId,
              foto_url: publicData.publicUrl,
              storage_path: nombreArchivo,
              comentario: foto.comentario,
              orden: fotosExistentes.length + i,
              es_principal:
                fotosExistentes.length === 0 &&
                fotosNuevas.length > 0 &&
                i === 0,
            },
          ]);

        if (insertFotoError) {
          throw new Error(
            "Error guardando foto nueva: " + insertFotoError.message
          );
        }
      }

      fotosNuevas.forEach((foto) => URL.revokeObjectURL(foto.preview));

      router.push(`/dashboard/servicio-tecnico/${ordenId}`);
    } catch (error: any) {
      alert(error.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 40 }}>Cargando reporte...</main>;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 32,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link
          href={`/dashboard/servicio-tecnico/${ordenId}`}
          style={{
            display: "inline-block",
            marginBottom: 20,
            textDecoration: "none",
            color: "#2563eb",
            fontWeight: 700,
          }}
        >
          ← Volver a la orden
        </Link>

        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 30,
            border: "1px solid #e2e8f0",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: 25, color: "#0f172a" }}>
            ✏️ Modificar reporte
          </h1>

          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
                Etapa
              </label>

              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              >
                <option value="Ingreso">Ingreso</option>
                <option value="Revisión">Revisión</option>
                <option value="Cotización">Cotización</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Reparación">Reparación</option>
                <option value="Listo">Listo</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>

            <CampoTexto
              label="Descripción"
              value={descripcion}
              onChange={setDescripcion}
            />

            <CampoTexto
              label="Hallazgos"
              value={hallazgos}
              onChange={setHallazgos}
            />

            <CampoTexto
              label="Acciones realizadas"
              value={acciones}
              onChange={setAcciones}
            />

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
                Costo
              </label>

              <input
                type="number"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>

            <section
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 18,
                background: "#f8fafc",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 20 }}>📷 Fotos del reporte</h2>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  style={botonAzul}
                >
                  📷 Tomar foto
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  style={botonNegro}
                >
                  🖼️ Elegir de galería
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  agregarFotos(e.target.files);
                  e.currentTarget.value = "";
                }}
              />

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  agregarFotos(e.target.files);
                  e.currentTarget.value = "";
                }}
              />

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                  gap: 14,
                }}
              >
                {fotosExistentes.map((foto) => (
                  <div key={foto.id} style={cardFoto}>
                    <img
                      src={foto.foto_url}
                      alt="foto reporte"
                      style={imagenFoto}
                    />

                    <button
                      type="button"
                      onClick={() => eliminarFotoExistente(foto)}
                      style={botonEliminar}
                    >
                      ×
                    </button>

                    {foto.comentario && (
                      <p style={{ marginBottom: 0, color: "#475569", fontSize: 13 }}>
                        {foto.comentario}
                      </p>
                    )}
                  </div>
                ))}

                {fotosNuevas.map((foto) => (
                  <div key={foto.id} style={cardFoto}>
                    <img src={foto.preview} alt="foto nueva" style={imagenFoto} />

                    <button
                      type="button"
                      onClick={() => eliminarFotoNueva(foto.id)}
                      style={botonEliminar}
                    >
                      ×
                    </button>

                    <textarea
                      value={foto.comentario}
                      onChange={(e) =>
                        cambiarComentarioFotoNueva(foto.id, e.target.value)
                      }
                      placeholder="Comentario de la foto"
                      rows={3}
                      style={{
                        width: "100%",
                        marginTop: 10,
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <button
              onClick={guardarCambios}
              disabled={guardando}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: 16,
                borderRadius: 14,
                fontWeight: 800,
                cursor: guardando ? "not-allowed" : "pointer",
                fontSize: 16,
                opacity: guardando ? 0.7 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          padding: 14,
          borderRadius: 12,
          border: "1px solid #cbd5e1",
        }}
      />
    </div>
  );
}

const botonAzul = {
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const botonNegro = {
  backgroundColor: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const cardFoto = {
  position: "relative" as const,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 10,
  backgroundColor: "white",
};

const imagenFoto = {
  width: "100%",
  height: 160,
  objectFit: "cover" as const,
  borderRadius: 10,
  display: "block",
};

const botonEliminar = {
  position: "absolute" as const,
  top: 16,
  right: 16,
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "none",
  backgroundColor: "rgba(15, 23, 42, 0.85)",
  color: "white",
  cursor: "pointer",
  fontWeight: 800,
};