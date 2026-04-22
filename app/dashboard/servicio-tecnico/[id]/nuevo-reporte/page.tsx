"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../lib/supabase";

type FotoSubida = {
  foto_url: string;
  storage_path: string;
  comentario: string;
  orden: number;
  es_principal: boolean;
};

type FotoLocal = {
  id: string;
  file: File;
  preview: string;
  comentario: string;
  es_principal: boolean;
};

export default function NuevoReportePage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [etapa, setEtapa] = useState("Revisión");
  const [descripcion, setDescripcion] = useState("");
  const [hallazgos, setHallazgos] = useState("");
  const [acciones, setAcciones] = useState("");
  const [costo, setCosto] = useState("");
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [cargando, setCargando] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  function agregarArchivos(files: FileList | null) {
    if (!files || files.length === 0) return;

    const nuevos: FotoLocal[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      comentario: "",
      es_principal: fotos.length === 0 && index === 0,
    }));

    setFotos((prev) => {
      const resultado = [...prev, ...nuevos];

      if (!resultado.some((f) => f.es_principal) && resultado.length > 0) {
        resultado[0].es_principal = true;
      }

      return resultado;
    });
  }

  function eliminarFotoLocal(idFoto: string) {
    setFotos((prev) => {
      const foto = prev.find((f) => f.id === idFoto);
      if (foto) {
        URL.revokeObjectURL(foto.preview);
      }

      const nuevas = prev.filter((f) => f.id !== idFoto);

      if (nuevas.length > 0 && !nuevas.some((f) => f.es_principal)) {
        nuevas[0].es_principal = true;
      }

      return [...nuevas];
    });
  }

  function moverFoto(idFoto: string, direccion: "izquierda" | "derecha") {
    setFotos((prev) => {
      const index = prev.findIndex((f) => f.id === idFoto);
      if (index === -1) return prev;

      const nuevoIndex = direccion === "izquierda" ? index - 1 : index + 1;
      if (nuevoIndex < 0 || nuevoIndex >= prev.length) return prev;

      const copia = [...prev];
      const temporal = copia[index];
      copia[index] = copia[nuevoIndex];
      copia[nuevoIndex] = temporal;

      return copia;
    });
  }

  function marcarPrincipal(idFoto: string) {
    setFotos((prev) =>
      prev.map((foto) => ({
        ...foto,
        es_principal: foto.id === idFoto,
      }))
    );
  }

  function cambiarComentario(idFoto: string, valor: string) {
    setFotos((prev) =>
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

  async function guardarReporte() {
    if (!id) {
      alert("No se encontró el ID de la orden");
      return;
    }

    setCargando(true);

    try {
      const fotosSubidas: FotoSubida[] = [];

      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];
        const blobComprimido = await comprimirImagen(foto.file);

        const nombreArchivo = `${id}/${Date.now()}-${Math.random()
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

        fotosSubidas.push({
          foto_url: publicData.publicUrl,
          storage_path: nombreArchivo,
          comentario: foto.comentario,
          orden: i,
          es_principal: foto.es_principal,
        });
      }

      const { data: reporteInsertado, error: errorReporte } = await supabase
        .from("reportes")
        .insert([
          {
            orden_id: id,
            etapa,
            descripcion,
            hallazgos,
            acciones,
            costo: costo ? Number(costo) : null,
          },
        ])
        .select("id")
        .single();

      if (errorReporte) {
        throw new Error("Error al guardar reporte: " + errorReporte.message);
      }

      if (reporteInsertado && fotosSubidas.length > 0) {
        const fotosData = fotosSubidas.map((foto) => ({
          reporte_id: reporteInsertado.id,
          foto_url: foto.foto_url,
          storage_path: foto.storage_path,
          comentario: foto.comentario,
          orden: foto.orden,
          es_principal: foto.es_principal,
        }));

        const { error: errorFotos } = await supabase
          .from("reporte_fotos")
          .insert(fotosData);

        if (errorFotos) {
          throw new Error(
            "Reporte guardado, pero falló guardar fotos: " + errorFotos.message
          );
        }
      }

      const { error: errorOrden } = await supabase
        .from("ordenes")
        .update({ estado: etapa })
        .eq("id", id);

      if (errorOrden) {
        throw new Error(
          "Reporte guardado, pero no se pudo actualizar la orden: " +
            errorOrden.message
        );
      }

      fotos.forEach((foto) => {
        URL.revokeObjectURL(foto.preview);
      });

      router.push(`/dashboard/servicio-tecnico/${id}`);
    } catch (error: any) {
      alert(error.message || "Ocurrió un error al guardar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Nuevo Reporte</h1>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Etapa
        </label>
        <select
          value={etapa}
          onChange={(e) => setEtapa(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        >
          <option value="Revisión">Revisión</option>
          <option value="Cotización">Cotización</option>
          <option value="Mantenimiento">Mantenimiento</option>
          <option value="Reparación">Reparación</option>
          <option value="Listo">Listo</option>
          <option value="Entregado">Entregado</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Descripción
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Hallazgos
        </label>
        <textarea
          value={hallazgos}
          onChange={(e) => setHallazgos(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Acciones
        </label>
        <textarea
          value={acciones}
          onChange={(e) => setAcciones(e.target.value)}
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          Costo
        </label>
        <input
          type="number"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 12, fontWeight: 600 }}>
          Fotos
        </label>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 16px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            📷 Tomar foto
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            style={{
              backgroundColor: "#0f172a",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 16px",
              cursor: "pointer",
              fontWeight: 600,
            }}
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
            agregarArchivos(e.target.files);
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
            agregarArchivos(e.target.files);
            e.currentTarget.value = "";
          }}
        />

        {fotos.length > 0 && (
          <div style={{ marginTop: 10, color: "#475569", fontSize: 14 }}>
            {fotos.length} foto(s) seleccionada(s)
          </div>
        )}

        {fotos.length > 0 && (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {fotos.map((foto, index) => (
              <div
                key={foto.id}
                style={{
                  border: foto.es_principal
                    ? "2px solid #2563eb"
                    : "1px solid #dbe4f0",
                  borderRadius: 14,
                  overflow: "hidden",
                  backgroundColor: "white",
                  boxShadow: foto.es_principal
                    ? "0 0 0 3px rgba(37,99,235,0.08)"
                    : "none",
                }}
              >
                <div style={{ position: "relative" }}>
                  <img
                    src={foto.preview}
                    alt="preview"
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => eliminarFotoLocal(foto.id)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>

                  {foto.es_principal && (
                    <div
                      style={{
                        position: "absolute",
                        left: 8,
                        top: 8,
                        backgroundColor: "#2563eb",
                        color: "white",
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Principal
                    </div>
                  )}
                </div>

                <div style={{ padding: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => moverFoto(foto.id, "izquierda")}
                      disabled={index === 0}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        backgroundColor: index === 0 ? "#f1f5f9" : "white",
                        cursor: index === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      onClick={() => moverFoto(foto.id, "derecha")}
                      disabled={index === fotos.length - 1}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        backgroundColor:
                          index === fotos.length - 1 ? "#f1f5f9" : "white",
                        cursor:
                          index === fotos.length - 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      →
                    </button>

                    <button
                      type="button"
                      onClick={() => marcarPrincipal(foto.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "none",
                        backgroundColor: foto.es_principal
                          ? "#2563eb"
                          : "#e2e8f0",
                        color: foto.es_principal ? "white" : "#0f172a",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {foto.es_principal ? "Principal" : "Marcar principal"}
                    </button>
                  </div>

                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    Comentario de la foto
                  </label>

                  <textarea
                    value={foto.comentario}
                    onChange={(e) => cambiarComentario(foto.id, e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={guardarReporte}
        disabled={cargando}
        style={{
          backgroundColor: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "14px 18px",
          cursor: "pointer",
          fontWeight: 700,
          width: "100%",
          fontSize: 16,
        }}
      >
        {cargando ? "Guardando..." : "Guardar y volver"}
      </button>
    </div>
  );
}