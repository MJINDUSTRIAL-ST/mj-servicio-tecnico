"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Cliente = {
  id: string;
  nombre: string;
  email: string | null;
  empresa: string | null;
};

type DocumentoOrden = {
  tipo: string;
  file: File;
};

type TipoIngreso = "individual" | "lote";

type EquipoLote = {
  equipo: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  accesorios_entregados: string;
  problema_reportado: string;
  observaciones_iniciales: string;
  fotos: File[];
};

function crearEquipoLote(): EquipoLote {
  return {
    equipo: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    accesorios_entregados: "",
    problema_reportado: "",
    observaciones_iniciales: "",
    fotos: [],
  };
}

export default function NuevaOrden() {
  const router = useRouter();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");

  const [codigo, setCodigo] = useState("");
  const [tecnicoIngreso, setTecnicoIngreso] = useState("");
  const [tipoIngreso, setTipoIngreso] = useState<TipoIngreso>("individual");
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [equiposLote, setEquiposLote] = useState<EquipoLote[]>([
    crearEquipoLote(),
    crearEquipoLote(),
  ]);

  const [equipo, setEquipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [accesoriosEntregados, setAccesoriosEntregados] = useState("");
  const [prioridad, setPrioridad] = useState("Media");
  const [problemaReportado, setProblemaReportado] = useState("");
  const [observacionesIniciales, setObservacionesIniciales] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoOrden[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, email, empresa")
        .order("nombre", { ascending: true });

      setClientes(clientesData || []);

      const { data: ordenesData } = await supabase
        .from("ordenes")
        .select("codigo")
        .like("codigo", "OT-%");

      let mayorNumero = 0;

      (ordenesData || []).forEach((orden) => {
        const codigoBase = String(orden.codigo || "")
          .split("-")
          .slice(0, 2)
          .join("-");
        const numero = Number(codigoBase.replace("OT-", ""));

        if (!isNaN(numero) && numero > mayorNumero) {
          mayorNumero = numero;
        }
      });

      const siguienteNumero = mayorNumero + 1;
      setCodigo(`OT-${String(siguienteNumero).padStart(3, "0")}`);
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    setEquiposLote((prev) => {
      const cantidad = Math.max(2, Number(cantidadEquipos) || 2);
      const copia = [...prev];

      if (copia.length < cantidad) {
        while (copia.length < cantidad) {
          copia.push(crearEquipoLote());
        }
      }

      if (copia.length > cantidad) {
        copia.length = cantidad;
      }

      return copia;
    });
  }, [cantidadEquipos]);

  function actualizarEquipoLote(
    index: number,
    campo: keyof Omit<EquipoLote, "fotos">,
    valor: string
  ) {
    setEquiposLote((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  }

  function agregarFotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFotos((prev) => [...prev, ...Array.from(files)]);
  }

  function eliminarFoto(index: number) {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  }

  function agregarFotosEquipoLote(index: number, files: FileList | null) {
    if (!files || files.length === 0) return;

    setEquiposLote((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              fotos: [...item.fotos, ...Array.from(files)],
            }
          : item
      )
    );
  }

  function eliminarFotoEquipoLote(indexEquipo: number, indexFoto: number) {
    setEquiposLote((prev) =>
      prev.map((item, i) =>
        i === indexEquipo
          ? {
              ...item,
              fotos: item.fotos.filter((_, fotoIndex) => fotoIndex !== indexFoto),
            }
          : item
      )
    );
  }

  function agregarDocumentos(tipo: string, files: FileList | null) {
    if (!files || files.length === 0) return;

    const nuevos = Array.from(files).map((file) => ({
      tipo,
      file,
    }));

    setDocumentos((prev) => [...prev, ...nuevos]);
  }

  function eliminarDocumento(index: number) {
    setDocumentos((prev) => prev.filter((_, i) => i !== index));
  }

  const subirFotosPorCodigo = async (codigoOrden: string, fotosASubir: File[]) => {
    if (fotosASubir.length === 0) return "";

    const urls: string[] = [];

    for (const foto of fotosASubir) {
      const extension = foto.name.split(".").pop();
      const nombreArchivo = `${codigoOrden}/fotos/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.${extension}`;

      const { error } = await supabase.storage
        .from("ordenes-fotos")
        .upload(nombreArchivo, foto);

      if (error) throw new Error(error.message);

      const { data } = supabase.storage
        .from("ordenes-fotos")
        .getPublicUrl(nombreArchivo);

      urls.push(data.publicUrl);
    }

    return urls.join(",");
  };

  const subirFotos = async () => {
    return subirFotosPorCodigo(codigo, fotos);
  };

  const subirDocumentos = async (ordenId: string) => {
    if (documentos.length === 0) return;

    for (const documento of documentos) {
      const nombreLimpio = documento.file.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const storagePath = `${codigo}/documentos/${documento.tipo}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}-${nombreLimpio}`;

      const { error: uploadError } = await supabase.storage
        .from("ordenes-documentos")
        .upload(storagePath, documento.file, {
          contentType: documento.file.type || "application/pdf",
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage
        .from("ordenes-documentos")
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase
        .from("orden_documentos")
        .insert([
          {
            orden_id: ordenId,
            nombre: documento.file.name,
            tipo: documento.tipo,
            url: data.publicUrl,
            storage_path: storagePath,
          },
        ]);

      if (insertError) throw new Error(insertError.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

    if (!clienteSeleccionado) {
      alert("Selecciona un cliente");
      return;
    }

    if (!clienteSeleccionado.email) {
      alert("El cliente no tiene email registrado");
      return;
    }

    if (!tecnicoIngreso.trim()) {
      alert("Ingresa el nombre del técnico o vendedor");
      return;
    }

    if (!equipo.trim() || !problemaReportado.trim()) {
      alert("Completa tipo de equipo y problema reportado");
      return;
    }

    if (tipoIngreso === "lote" && cantidadEquipos < 2) {
      alert("El lote debe tener al menos 2 equipos");
      return;
    }

    setGuardando(true);

    try {
      const fotosUrl = await subirFotos();

      if (tipoIngreso === "individual") {
        const { data: ordenCreada, error } = await supabase
          .from("ordenes")
          .insert([
            {
              codigo,
              cliente: clienteSeleccionado.nombre,
              cliente_email: clienteSeleccionado.email.trim().toLowerCase(),
              tecnico_ingreso: tecnicoIngreso,
              equipo,
              estado: "Ingreso",
              prioridad,
              marca,
              modelo,
              numero_serie: numeroSerie,
              accesorios_entregados: accesoriosEntregados,
              problema_reportado: problemaReportado,
              observaciones_iniciales: observacionesIniciales,
              fotos_estado_inicial: fotosUrl,
              es_lote: false,
              cantidad_equipos: 1,
              orden_padre_id: null,
            },
          ])
          .select("id")
          .single();

        if (error) {
          alert("Error creando orden: " + error.message);
          setGuardando(false);
          return;
        }

        if (!ordenCreada?.id) {
          alert("La orden se creó, pero no se pudo obtener el ID.");
          setGuardando(false);
          return;
        }

        await subirDocumentos(ordenCreada.id);
      }

      if (tipoIngreso === "lote") {
        const { data: ordenMadre, error: errorMadre } = await supabase
          .from("ordenes")
          .insert([
            {
              codigo,
              cliente: clienteSeleccionado.nombre,
              cliente_email: clienteSeleccionado.email.trim().toLowerCase(),
              tecnico_ingreso: tecnicoIngreso,
              equipo: `Lote de ${cantidadEquipos} equipos - ${equipo}`,
              estado: "Ingreso",
              prioridad,
              marca,
              modelo,
              numero_serie: "",
              accesorios_entregados: accesoriosEntregados,
              problema_reportado: problemaReportado,
              observaciones_iniciales: observacionesIniciales,
              fotos_estado_inicial: fotosUrl,
              es_lote: true,
              cantidad_equipos: cantidadEquipos,
              orden_padre_id: null,
            },
          ])
          .select("id")
          .single();

        if (errorMadre) {
          alert("Error creando lote: " + errorMadre.message);
          setGuardando(false);
          return;
        }

        if (!ordenMadre?.id) {
          alert("El lote se creó, pero no se pudo obtener el ID.");
          setGuardando(false);
          return;
        }

        await subirDocumentos(ordenMadre.id);

        const ordenesHijas = [];

        for (let index = 0; index < equiposLote.length; index++) {
          const item = equiposLote[index];
          const numeroHijo = String(index + 1).padStart(2, "0");
          const codigoHijo = `${codigo}-${numeroHijo}`;
          const fotosHijoUrl = await subirFotosPorCodigo(codigoHijo, item.fotos);

          ordenesHijas.push({
            codigo: codigoHijo,
            cliente: clienteSeleccionado.nombre,
            cliente_email: clienteSeleccionado.email.trim().toLowerCase(),
            tecnico_ingreso: tecnicoIngreso,
            equipo: item.equipo.trim() || equipo,
            estado: "Ingreso",
            prioridad,
            marca: item.marca.trim() || marca,
            modelo: item.modelo.trim() || modelo,
            numero_serie: item.numero_serie.trim(),
            accesorios_entregados:
              item.accesorios_entregados.trim() || accesoriosEntregados,
            problema_reportado:
              item.problema_reportado.trim() || problemaReportado,
            observaciones_iniciales:
              item.observaciones_iniciales.trim() || observacionesIniciales,
            fotos_estado_inicial: fotosHijoUrl,
            es_lote: false,
            cantidad_equipos: 1,
            orden_padre_id: ordenMadre.id,
          });
        }

        const { error: errorHijas } = await supabase
          .from("ordenes")
          .insert(ordenesHijas);

        if (errorHijas) {
          alert(
            "El lote madre se creó, pero hubo error creando equipos: " +
              errorHijas.message
          );
          setGuardando(false);
          return;
        }
      }

      router.push("/dashboard/servicio-tecnico");
    } catch (error: any) {
      alert("Error guardando orden: " + error.message);
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <button
        type="button"
        onClick={() => router.push("/dashboard/servicio-tecnico")}
        className="mb-6 text-sm text-slate-500 hover:text-slate-900"
      >
        ← Volver al Dashboard
      </button>

      <h1 className="text-3xl font-bold text-slate-900">
        Nueva Orden de Servicio
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        Registrar ingreso individual o lote de equipos
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Tipo de ingreso</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setTipoIngreso("individual")}
              className={`rounded-xl border p-5 text-left ${
                tipoIngreso === "individual"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="font-bold text-slate-900">Equipo individual</p>
              <p className="mt-1 text-sm text-slate-500">
                Una OT para un solo equipo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTipoIngreso("lote")}
              className={`rounded-xl border p-5 text-left ${
                tipoIngreso === "lote"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="font-bold text-slate-900">Lote de equipos</p>
              <p className="mt-1 text-sm text-slate-500">
                Una OT madre con varios equipos hijos.
              </p>
            </button>
          </div>

          {tipoIngreso === "lote" ? (
            <div className="mt-5">
              <label className="mb-1 block text-sm font-semibold">
                Cantidad de equipos
              </label>

              <input
                type="number"
                min={2}
                max={100}
                value={cantidadEquipos}
                onChange={(e) =>
                  setCantidadEquipos(Math.max(2, Number(e.target.value) || 2))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-3 md:w-48"
              />
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Cliente</h2>

          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-3"
          >
            <option value="">Seleccionar cliente...</option>

            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
                {cliente.empresa ? ` — ${cliente.empresa}` : ""}
                {cliente.email ? ` (${cliente.email})` : ""}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Técnico / Vendedor</h2>

          <label className="mb-1 block text-sm font-semibold">
            Nombre de quien ingresa la orden *
          </label>

          <input
            placeholder="Ej: Andrés, Gustavo, Alexandra..."
            value={tecnicoIngreso}
            onChange={(e) => setTecnicoIngreso(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-3"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Equipo / Herramienta</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold">
              Código de orden
            </label>
            <input
              value={codigo}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-3 text-slate-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputTexto
              label="Tipo de Equipo *"
              value={equipo}
              setValue={setEquipo}
              placeholder="Ej: Tecle eléctrico, winche..."
              required
            />
            <InputTexto
              label="Marca"
              value={marca}
              setValue={setMarca}
              placeholder="Marca"
            />
            <InputTexto
              label="Modelo"
              value={modelo}
              setValue={setModelo}
              placeholder="Modelo"
            />
            <InputTexto
              label="Número de Serie"
              value={numeroSerie}
              setValue={setNumeroSerie}
              placeholder="S/N"
            />
          </div>

          <div className="mt-4">
            <InputTexto
              label="Accesorios Entregados"
              value={accesoriosEntregados}
              setValue={setAccesoriosEntregados}
              placeholder="Cable, control, maletín..."
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
            >
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
          </div>
        </section>

        {tipoIngreso === "lote" ? (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="mb-2 text-lg font-bold">Equipos del lote</h2>
            <p className="mb-5 text-sm text-slate-600">
              Cada equipo puede tener datos y fotos propias.
            </p>

            <div className="space-y-4">
              {equiposLote.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <p className="mb-4 font-bold text-slate-900">
                    Equipo {index + 1} — {codigo}-
                    {String(index + 1).padStart(2, "0")}
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputTexto
                      label="Tipo de equipo"
                      value={item.equipo}
                      setValue={(value) =>
                        actualizarEquipoLote(index, "equipo", value)
                      }
                      placeholder={equipo || "Ej: Tecle eléctrico"}
                    />

                    <InputTexto
                      label="Marca"
                      value={item.marca}
                      setValue={(value) =>
                        actualizarEquipoLote(index, "marca", value)
                      }
                      placeholder={marca || "Marca"}
                    />

                    <InputTexto
                      label="Modelo"
                      value={item.modelo}
                      setValue={(value) =>
                        actualizarEquipoLote(index, "modelo", value)
                      }
                      placeholder={modelo || "Modelo"}
                    />

                    <InputTexto
                      label="Número de serie"
                      value={item.numero_serie}
                      setValue={(value) =>
                        actualizarEquipoLote(index, "numero_serie", value)
                      }
                      placeholder="S/N"
                    />

                    <InputTexto
                      label="Accesorios"
                      value={item.accesorios_entregados}
                      setValue={(value) =>
                        actualizarEquipoLote(
                          index,
                          "accesorios_entregados",
                          value
                        )
                      }
                      placeholder={accesoriosEntregados || "Accesorios"}
                    />

                    <InputTexto
                      label="Problema"
                      value={item.problema_reportado}
                      setValue={(value) =>
                        actualizarEquipoLote(index, "problema_reportado", value)
                      }
                      placeholder={problemaReportado || "Problema reportado"}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-semibold">
                      Observaciones
                    </label>
                    <textarea
                      value={item.observaciones_iniciales}
                      onChange={(e) =>
                        actualizarEquipoLote(
                          index,
                          "observaciones_iniciales",
                          e.target.value
                        )
                      }
                      placeholder={
                        observacionesIniciales || "Observaciones específicas"
                      }
                      className="min-h-20 w-full rounded-lg border border-slate-300 px-3 py-3"
                    />
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 font-semibold text-slate-900">
                      Fotos propias del equipo {index + 1}
                    </p>

                    <div className="grid gap-3 md:grid-cols-2">
                      <InputFoto
                        label="Tomar foto"
                        descripcion="Foto directa del equipo"
                        capture
                        onChange={(files) => agregarFotosEquipoLote(index, files)}
                      />

                      <InputFoto
                        label="Subir desde galería"
                        descripcion="Seleccionar fotos del equipo"
                        onChange={(files) => agregarFotosEquipoLote(index, files)}
                      />
                    </div>

                    {item.fotos.length > 0 ? (
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <p className="font-semibold">
                          Fotos seleccionadas para este equipo:
                        </p>

                        {item.fotos.map((foto, fotoIndex) => (
                          <div
                            key={`${foto.name}-${foto.lastModified}-${fotoIndex}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <span>
                              {fotoIndex + 1}. {foto.name}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarFotoEquipoLote(index, fotoIndex)
                              }
                              className="text-sm font-semibold text-red-600 hover:text-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        Aún no hay fotos para este equipo.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">Problema Reportado</h2>

          <label className="mb-1 block text-sm font-semibold">
            Descripción del problema *
          </label>
          <textarea
            placeholder="Describa el problema que presenta el equipo o lote..."
            value={problemaReportado}
            onChange={(e) => setProblemaReportado(e.target.value)}
            required
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-3"
          />

          <label className="mb-1 mt-4 block text-sm font-semibold">
            Observaciones iniciales
          </label>
          <textarea
            placeholder="Estado visual, golpes, desgaste..."
            value={observacionesIniciales}
            onChange={(e) => setObservacionesIniciales(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-3"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-bold">Fotos generales del ingreso</h2>

          <p className="mb-4 text-sm text-slate-500">
            En lotes, estas fotos quedan asociadas a la OT madre. Ej: pallet,
            guía, recepción general.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <InputFoto
              label="Tomar foto ahora"
              descripcion="Abrirá la cámara del celular"
              capture
              onChange={agregarFotos}
            />
            <InputFoto
              label="Subir desde galería"
              descripcion="Selecciona fotos guardadas"
              onChange={agregarFotos}
            />
          </div>

          {fotos.length > 0 && (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="font-semibold">Fotos generales seleccionadas:</p>
              {fotos.map((foto, index) => (
                <div
                  key={`${foto.name}-${foto.lastModified}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span>
                    {index + 1}. {foto.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => eliminarFoto(index)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-lg font-bold">PDFs del Ingreso</h2>

          <p className="mb-4 text-sm text-slate-500">
            En lotes, estos documentos quedarán asociados a la OT madre.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <InputPDF
              label="Orden de Compra PDF"
              tipo="orden-compra"
              onChange={agregarDocumentos}
            />
            <InputPDF
              label="Cotización PDF"
              tipo="cotizacion"
              onChange={agregarDocumentos}
            />
            <InputPDF
              label="Informe recibido PDF"
              tipo="informe-recibido"
              onChange={agregarDocumentos}
            />
            <InputPDF
              label="Otros documentos PDF"
              tipo="otros"
              onChange={agregarDocumentos}
            />
          </div>

          {documentos.length > 0 && (
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p className="font-semibold">PDFs seleccionados:</p>

              {documentos.map((documento, index) => (
                <div
                  key={`${documento.tipo}-${documento.file.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <span>
                    {index + 1}. {documento.tipo}: {documento.file.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => eliminarDocumento(index)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/servicio-tecnico")}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={guardando}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {guardando
              ? "Creando..."
              : tipoIngreso === "lote"
              ? "Crear Lote"
              : "Crear Orden"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InputTexto({
  label,
  value,
  setValue,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-3 py-3"
      />
    </div>
  );
}

function InputFoto({
  label,
  descripcion,
  capture = false,
  onChange,
}: {
  label: string;
  descripcion: string;
  capture?: boolean;
  onChange: (files: FileList | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center hover:bg-slate-50">
      <span className="block text-2xl">📷</span>
      <span className="mt-2 block font-semibold">{label}</span>
      <span className="mt-1 block text-sm text-slate-500">{descripcion}</span>

      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        multiple
        onChange={(e) => {
          onChange(e.target.files);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
    </label>
  );
}

function InputPDF({
  label,
  tipo,
  onChange,
}: {
  label: string;
  tipo: string;
  onChange: (tipo: string, files: FileList | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center hover:bg-slate-50">
      <span className="block text-2xl">📄</span>
      <span className="mt-2 block font-semibold">{label}</span>
      <span className="mt-1 block text-sm text-slate-500">
        Seleccionar archivo PDF
      </span>

      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          onChange(tipo, e.target.files);
          e.currentTarget.value = "";
        }}
        className="hidden"
      />
    </label>
  );
}