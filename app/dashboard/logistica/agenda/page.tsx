"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type TipoLogistica = "retiro" | "despacho" | "retiro_taller";

type EstadoLogistica =
  | "solicitado"
  | "agendado"
  | "en_ruta"
  | "realizado"
  | "cancelado";

type OrigenLogistica = "manual" | "servicio_tecnico" | "venta";

type EventoLogistica = {
  id: string;
  tipo: TipoLogistica;
  estado: EstadoLogistica;
  fecha: string;
  hora: string | null;
  cliente: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  comuna: string | null;
  region: string | null;
  observacion: string | null;
  orden_id: string | null;
  codigo_ot: string | null;
  origen: OrigenLogistica | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FormularioLogistica = {
  id: string | null;
  tipo: TipoLogistica;
  estado: EstadoLogistica;
  fecha: string;
  hora: string;
  cliente: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  comuna: string;
  region: string;
  observacion: string;
  codigo_ot: string;
  orden_id: string;
  origen: OrigenLogistica;
};

const ESTADOS: EstadoLogistica[] = [
  "solicitado",
  "agendado",
  "en_ruta",
  "realizado",
  "cancelado",
];

const TIPOS: TipoLogistica[] = ["retiro", "despacho", "retiro_taller"];

const DIRECCION_TALLER_MJ = "Taller MJ Industrial";

function fechaHoyISO() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaISO(fecha: Date) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nombreMes(fecha: Date) {
  return fecha.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
}

function nombreDiaCorto(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatearHora(hora?: string | null) {
  if (!hora) return "Sin hora";
  return hora.slice(0, 5);
}

function etiquetaTipo(tipo: TipoLogistica) {
  if (tipo === "retiro") return "Retiro";
  if (tipo === "despacho") return "Despacho";
  return "Retiro en taller";
}

function etiquetaEstado(estado: EstadoLogistica) {
  if (estado === "solicitado") return "Solicitado";
  if (estado === "agendado") return "Agendado";
  if (estado === "en_ruta") return "En ruta";
  if (estado === "realizado") return "Realizado";
  return "Cancelado";
}

function etiquetaOrigen(origen?: string | null) {
  if (origen === "servicio_tecnico") return "Servicio técnico";
  if (origen === "venta") return "Venta";
  return "Manual";
}

function claseTipo(tipo: TipoLogistica) {
  if (tipo === "retiro") return "tipoRetiro";
  if (tipo === "despacho") return "tipoDespacho";
  return "tipoTaller";
}

function claseEstado(estado: EstadoLogistica) {
  if (estado === "solicitado") return "estadoSolicitado";
  if (estado === "agendado") return "estadoAgendado";
  if (estado === "en_ruta") return "estadoRuta";
  if (estado === "realizado") return "estadoRealizado";
  return "estadoCancelado";
}

function formularioVacio(fechaBase?: string): FormularioLogistica {
  return {
    id: null,
    tipo: "retiro",
    estado: "solicitado",
    fecha: fechaBase || fechaHoyISO(),
    hora: "",
    cliente: "",
    contacto: "",
    telefono: "",
    email: "",
    direccion: "",
    comuna: "",
    region: "Región Metropolitana",
    observacion: "",
    codigo_ot: "",
    orden_id: "",
    origen: "manual",
  };
}

function convertirEventoAFormulario(evento: EventoLogistica): FormularioLogistica {
  return {
    id: evento.id,
    tipo:
      evento.tipo === "retiro" ||
      evento.tipo === "despacho" ||
      evento.tipo === "retiro_taller"
        ? evento.tipo
        : "retiro",
    estado: ESTADOS.includes(evento.estado) ? evento.estado : "solicitado",
    fecha: evento.fecha,
    hora: evento.hora ? evento.hora.slice(0, 5) : "",
    cliente: evento.cliente || "",
    contacto: evento.contacto || "",
    telefono: evento.telefono || "",
    email: evento.email || "",
    direccion: evento.direccion || "",
    comuna: evento.comuna || "",
    region: evento.region || "Región Metropolitana",
    observacion: evento.observacion || "",
    codigo_ot: evento.codigo_ot || "",
    orden_id: evento.orden_id || "",
    origen:
      evento.origen === "servicio_tecnico" ||
      evento.origen === "venta" ||
      evento.origen === "manual"
        ? evento.origen
        : "manual",
  };
}

function construirDiasCalendario(fechaActual: Date) {
  const inicio = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
  const fin = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);

  const dias: Date[] = [];
  const primerDiaSemana = inicio.getDay() === 0 ? 6 : inicio.getDay() - 1;

  for (let i = primerDiaSemana; i > 0; i -= 1) {
    dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), 1 - i));
  }

  for (let dia = 1; dia <= fin.getDate(); dia += 1) {
    dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), dia));
  }

  while (dias.length % 7 !== 0) {
    const ultimo = dias[dias.length - 1];
    dias.push(
      new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1),
    );
  }

  return dias;
}

function ordenarEventos(eventos: EventoLogistica[]) {
  return [...eventos].sort((a, b) => {
    const horaA = a.hora || "99:99";
    const horaB = b.hora || "99:99";
    return horaA.localeCompare(horaB);
  });
}

function validarUUID(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor,
  );
}

export default function AgendaOperativaPage() {
  const [eventos, setEventos] = useState<EventoLogistica[]>([]);
  const [fechaActual, setFechaActual] = useState(() => new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyISO());
  const [formulario, setFormulario] = useState<FormularioLogistica>(() =>
    formularioVacio(fechaHoyISO()),
  );
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoLogistica | "todos">(
    "todos",
  );
  const [filtroTipo, setFiltroTipo] = useState<TipoLogistica | "todos">("todos");

  useEffect(() => {
    cargarEventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaActual]);

  async function cargarEventos() {
    setLoading(true);

    const desde = fechaISO(
      new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1),
    );
    const hasta = fechaISO(
      new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0),
    );

    const { data, error } = await supabase
      .from("agenda_logistica")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (error) {
      console.error("Error cargando agenda logística:", error);
      alert(error.message || "No se pudo cargar la agenda logística.");
      setEventos([]);
      setLoading(false);
      return;
    }

    setEventos((data || []) as EventoLogistica[]);
    setLoading(false);
  }

  function abrirNuevo(fecha?: string, tipo?: TipoLogistica) {
    const fechaBase = fecha || fechaSeleccionada || fechaHoyISO();
    setFormulario({
      ...formularioVacio(fechaBase),
      tipo: tipo || "retiro",
      direccion: tipo === "retiro_taller" ? DIRECCION_TALLER_MJ : "",
      comuna: tipo === "retiro_taller" ? "Taller MJ" : "",
    });
    setMostrarFormulario(true);
  }

  function abrirEditar(evento: EventoLogistica) {
    setFormulario(convertirEventoAFormulario(evento));
    setMostrarFormulario(true);
  }

  function actualizarFormulario(campo: keyof FormularioLogistica, valor: string) {
    setFormulario((prev) => {
      const nuevo = {
        ...prev,
        [campo]: valor,
      };

      if (campo === "tipo" && valor === "retiro_taller") {
        nuevo.direccion = nuevo.direccion || DIRECCION_TALLER_MJ;
        nuevo.comuna = nuevo.comuna || "Taller MJ";
      }

      return nuevo;
    });
  }

  async function guardarEvento() {
    if (!formulario.fecha) {
      alert("Debes ingresar una fecha.");
      return;
    }

    if (!formulario.cliente.trim()) {
      alert("Debes ingresar el cliente.");
      return;
    }

    if (formulario.tipo !== "retiro_taller" && !formulario.direccion.trim()) {
      alert("Debes ingresar la dirección.");
      return;
    }

    setGuardando(true);

    const ordenIdLimpio = formulario.orden_id.trim();

    const payload = {
      tipo: formulario.tipo,
      estado: formulario.estado,
      fecha: formulario.fecha,
      hora: formulario.hora || null,
      cliente: formulario.cliente.trim(),
      contacto: formulario.contacto.trim() || null,
      telefono: formulario.telefono.trim() || null,
      email: formulario.email.trim() || null,
      direccion:
        formulario.tipo === "retiro_taller"
          ? formulario.direccion.trim() || DIRECCION_TALLER_MJ
          : formulario.direccion.trim(),
      comuna: formulario.comuna.trim() || null,
      region: formulario.region.trim() || null,
      observacion: formulario.observacion.trim() || null,
      codigo_ot: formulario.codigo_ot.trim() || null,
      orden_id: validarUUID(ordenIdLimpio) ? ordenIdLimpio : null,
      origen: formulario.origen,
      updated_at: new Date().toISOString(),
    };

    const query = formulario.id
      ? supabase
          .from("agenda_logistica")
          .update(payload)
          .eq("id", formulario.id)
      : supabase.from("agenda_logistica").insert(payload);

    const { error } = await query;

    setGuardando(false);

    if (error) {
      console.error("Error guardando agenda logística:", error);
      alert(error.message || "No se pudo guardar el evento.");
      return;
    }

    setMostrarFormulario(false);
    await cargarEventos();
  }

  async function cambiarEstado(evento: EventoLogistica, estado: EstadoLogistica) {
    const { error } = await supabase
      .from("agenda_logistica")
      .update({
        estado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", evento.id);

    if (error) {
      alert(error.message || "No se pudo actualizar el estado.");
      return;
    }

    if (estado === "realizado" && evento.origen === "servicio_tecnico") {
      if (evento.orden_id) {
        const { error: errorOrden } = await supabase
          .from("ordenes")
          .update({ estado: "entregado" })
          .eq("id", evento.orden_id);

        if (errorOrden) {
          alert(
            "El evento quedó como realizado, pero no se pudo marcar la OT como entregada.",
          );
        }
      } else if (evento.codigo_ot) {
        const { error: errorOrdenCodigo } = await supabase
          .from("ordenes")
          .update({ estado: "entregado" })
          .eq("codigo", evento.codigo_ot);

        if (errorOrdenCodigo) {
          alert(
            "El evento quedó como realizado, pero no se pudo marcar la OT como entregada.",
          );
        }
      }
    }

    await cargarEventos();
  }

  async function eliminarEvento(evento: EventoLogistica) {
    const confirmar = window.confirm(
      `¿Eliminar ${etiquetaTipo(evento.tipo).toLowerCase()} de ${
        evento.cliente || "cliente"
      }?`,
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("agenda_logistica")
      .delete()
      .eq("id", evento.id);

    if (error) {
      alert(error.message || "No se pudo eliminar el evento.");
      return;
    }

    await cargarEventos();
  }

  const diasCalendario = useMemo(
    () => construirDiasCalendario(fechaActual),
    [fechaActual],
  );

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((evento) => {
      const coincideEstado =
        filtroEstado === "todos" || evento.estado === filtroEstado;
      const coincideTipo = filtroTipo === "todos" || evento.tipo === filtroTipo;

      return coincideEstado && coincideTipo;
    });
  }, [eventos, filtroEstado, filtroTipo]);

  const eventosPorFecha = useMemo(() => {
    const mapa: Record<string, EventoLogistica[]> = {};

    ordenarEventos(eventosFiltrados).forEach((evento) => {
      if (!mapa[evento.fecha]) mapa[evento.fecha] = [];
      mapa[evento.fecha].push(evento);
    });

    return mapa;
  }, [eventosFiltrados]);

  const eventosDiaSeleccionado = ordenarEventos(
    eventosFiltrados.filter((evento) => evento.fecha === fechaSeleccionada),
  );

  const resumen = useMemo(() => {
    return {
      total: eventos.length,
      retiros: eventos.filter((evento) => evento.tipo === "retiro").length,
      despachos: eventos.filter((evento) => evento.tipo === "despacho").length,
      taller: eventos.filter((evento) => evento.tipo === "retiro_taller").length,
      pendientes: eventos.filter(
        (evento) =>
          evento.estado === "solicitado" ||
          evento.estado === "agendado" ||
          evento.estado === "en_ruta",
      ).length,
      realizados: eventos.filter((evento) => evento.estado === "realizado")
        .length,
    };
  }, [eventos]);

  return (
    <main className="page">
      <Link href="/dashboard" className="backButton">
        ← Volver al dashboard
      </Link>

      <header className="header">
        <div>
          <p className="breadcrumb">Logística</p>
          <h1>Agenda Operativa</h1>
          <p className="subtitle">
            Calendario de retiros, despachos y retiros en taller para preparar
            equipos antes de la entrega.
          </p>
        </div>

        <div className="headerActions">
          <button
            type="button"
            onClick={() => abrirNuevo(undefined, "retiro")}
            className="primary"
          >
            + Agregar despacho / retiro
          </button>
        </div>
      </header>

      <section className="stats">
        <div>
          <span>Total mes</span>
          <strong>{resumen.total}</strong>
        </div>

        <div>
          <span>Retiros</span>
          <strong>{resumen.retiros}</strong>
        </div>

        <div>
          <span>Despachos</span>
          <strong>{resumen.despachos}</strong>
        </div>

        <div>
          <span>Retiro taller</span>
          <strong>{resumen.taller}</strong>
        </div>

        <div>
          <span>Pendientes</span>
          <strong>{resumen.pendientes}</strong>
        </div>

        <div>
          <span>Realizados</span>
          <strong>{resumen.realizados}</strong>
        </div>
      </section>

      <section className="toolbar">
        <div className="monthControls">
          <button
            type="button"
            onClick={() =>
              setFechaActual(
                new Date(
                  fechaActual.getFullYear(),
                  fechaActual.getMonth() - 1,
                  1,
                ),
              )
            }
          >
            ← Mes anterior
          </button>

          <button
            type="button"
            onClick={() => {
              const hoy = new Date();
              setFechaActual(hoy);
              setFechaSeleccionada(fechaHoyISO());
            }}
          >
            Hoy
          </button>

          <strong>{nombreMes(fechaActual)}</strong>

          <button
            type="button"
            onClick={() =>
              setFechaActual(
                new Date(
                  fechaActual.getFullYear(),
                  fechaActual.getMonth() + 1,
                  1,
                ),
              )
            }
          >
            Mes siguiente →
          </button>
        </div>

        <div className="filters">
          <select
            value={filtroTipo}
            onChange={(event) =>
              setFiltroTipo(event.target.value as TipoLogistica | "todos")
            }
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {etiquetaTipo(tipo)}
              </option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(event) =>
              setFiltroEstado(event.target.value as EstadoLogistica | "todos")
            }
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {etiquetaEstado(estado)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="quickActions">
        <button type="button" onClick={() => abrirNuevo(fechaSeleccionada, "retiro")}>
          + Retiro cliente
        </button>
        <button
          type="button"
          onClick={() => abrirNuevo(fechaSeleccionada, "despacho")}
        >
          + Despacho
        </button>
        <button
          type="button"
          onClick={() => abrirNuevo(fechaSeleccionada, "retiro_taller")}
        >
          + Retiro en taller
        </button>
      </section>

      <section className="layout">
        <div className="calendarCard">
          <div className="weekdays">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          <div className="calendar">
            {diasCalendario.map((dia) => {
              const iso = fechaISO(dia);
              const eventosDia = eventosPorFecha[iso] || [];
              const esMesActual = dia.getMonth() === fechaActual.getMonth();
              const seleccionado = iso === fechaSeleccionada;
              const esHoy = iso === fechaHoyISO();

              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => setFechaSeleccionada(iso)}
                  onDoubleClick={() => abrirNuevo(iso)}
                  className={[
                    "day",
                    !esMesActual ? "muted" : "",
                    seleccionado ? "selected" : "",
                    esHoy ? "today" : "",
                  ].join(" ")}
                >
                  <div className="dayTop">
                    <strong>{dia.getDate()}</strong>
                    {eventosDia.length > 0 && <span>{eventosDia.length}</span>}
                  </div>

                  <div className="eventDots">
                    {eventosDia.slice(0, 4).map((evento) => (
                      <div
                        key={evento.id}
                        className={`miniEvent ${claseTipo(evento.tipo)} ${claseEstado(
                          evento.estado,
                        )}`}
                      >
                        {formatearHora(evento.hora)} · {etiquetaTipo(evento.tipo)}
                      </div>
                    ))}

                    {eventosDia.length > 4 && (
                      <small>+ {eventosDia.length - 4} más</small>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="sideCard">
          <div className="sideHeader">
            <div>
              <span>Día seleccionado</span>
              <h2>{nombreDiaCorto(fechaSeleccionada)}</h2>
            </div>

            <button type="button" onClick={() => abrirNuevo(fechaSeleccionada)}>
              + Agregar
            </button>
          </div>

          {loading && <p className="empty">Cargando agenda...</p>}

          {!loading && eventosDiaSeleccionado.length === 0 && (
            <p className="empty">No hay retiros ni despachos para este día.</p>
          )}

          <div className="eventList">
            {eventosDiaSeleccionado.map((evento) => (
              <article key={evento.id} className="eventCard">
                <div className="eventHeader">
                  <div className="pillGroup">
                    <span className={`pill ${claseTipo(evento.tipo)}`}>
                      {etiquetaTipo(evento.tipo)}
                    </span>
                    <span className={`pill ${claseEstado(evento.estado)}`}>
                      {etiquetaEstado(evento.estado)}
                    </span>
                  </div>

                  <strong>{formatearHora(evento.hora)}</strong>
                </div>

                <h3>{evento.cliente || "Sin cliente"}</h3>

                <p className="origen">{etiquetaOrigen(evento.origen)}</p>

                {evento.codigo_ot && <p className="ot">OT: {evento.codigo_ot}</p>}

                <p>
                  {[evento.direccion, evento.comuna]
                    .filter(Boolean)
                    .join(", ") || "Sin dirección"}
                </p>

                {(evento.contacto || evento.telefono) && (
                  <p>
                    Contacto: {[evento.contacto, evento.telefono]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                {evento.email && <p>Email: {evento.email}</p>}

                {evento.observacion && (
                  <p className="observacion">{evento.observacion}</p>
                )}

                <div className="eventActions">
                  <button type="button" onClick={() => abrirEditar(evento)}>
                    Editar
                  </button>

                  {evento.orden_id && (
                    <Link
                      href={`/dashboard/servicio-tecnico/${evento.orden_id}`}
                      className="linkButton"
                    >
                      Ver OT
                    </Link>
                  )}

                  {evento.estado !== "agendado" && (
                    <button
                      type="button"
                      onClick={() => cambiarEstado(evento, "agendado")}
                    >
                      Agendado
                    </button>
                  )}

                  {evento.estado !== "en_ruta" && (
                    <button
                      type="button"
                      onClick={() => cambiarEstado(evento, "en_ruta")}
                    >
                      En ruta
                    </button>
                  )}

                  {evento.estado !== "realizado" && (
                    <button
                      type="button"
                      className="success"
                      onClick={() => cambiarEstado(evento, "realizado")}
                    >
                      Realizado
                    </button>
                  )}

                  {evento.estado !== "cancelado" && (
                    <button
                      type="button"
                      className="warning"
                      onClick={() => cambiarEstado(evento, "cancelado")}
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    type="button"
                    className="danger"
                    onClick={() => eliminarEvento(evento)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      {mostrarFormulario && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <p>{formulario.id ? "Editar agenda" : "Nuevo registro"}</p>
                <h2>Despacho / retiro</h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={() => setMostrarFormulario(false)}
              >
                ×
              </button>
            </div>

            <div className="formGrid">
              <label>
                Tipo
                <select
                  value={formulario.tipo}
                  onChange={(event) =>
                    actualizarFormulario("tipo", event.target.value)
                  }
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {etiquetaTipo(tipo)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Estado
                <select
                  value={formulario.estado}
                  onChange={(event) =>
                    actualizarFormulario("estado", event.target.value)
                  }
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado} value={estado}>
                      {etiquetaEstado(estado)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fecha
                <input
                  type="date"
                  value={formulario.fecha}
                  onChange={(event) =>
                    actualizarFormulario("fecha", event.target.value)
                  }
                />
              </label>

              <label>
                Hora
                <input
                  type="time"
                  value={formulario.hora}
                  onChange={(event) =>
                    actualizarFormulario("hora", event.target.value)
                  }
                />
              </label>

              <label>
                Cliente
                <input
                  value={formulario.cliente}
                  onChange={(event) =>
                    actualizarFormulario("cliente", event.target.value)
                  }
                  placeholder="Nombre cliente o empresa"
                />
              </label>

              <label>
                Contacto
                <input
                  value={formulario.contacto}
                  onChange={(event) =>
                    actualizarFormulario("contacto", event.target.value)
                  }
                  placeholder="Persona de contacto"
                />
              </label>

              <label>
                Teléfono
                <input
                  value={formulario.telefono}
                  onChange={(event) =>
                    actualizarFormulario("telefono", event.target.value)
                  }
                  placeholder="+56 9..."
                />
              </label>

              <label>
                Email
                <input
                  value={formulario.email}
                  onChange={(event) =>
                    actualizarFormulario("email", event.target.value)
                  }
                  placeholder="correo@empresa.cl"
                />
              </label>

              <label className="span2">
                Dirección
                <input
                  value={formulario.direccion}
                  onChange={(event) =>
                    actualizarFormulario("direccion", event.target.value)
                  }
                  placeholder={
                    formulario.tipo === "retiro_taller"
                      ? DIRECCION_TALLER_MJ
                      : "Dirección completa"
                  }
                />
              </label>

              <label>
                Comuna
                <input
                  value={formulario.comuna}
                  onChange={(event) =>
                    actualizarFormulario("comuna", event.target.value)
                  }
                  placeholder="Comuna"
                />
              </label>

              <label>
                Región
                <input
                  value={formulario.region}
                  onChange={(event) =>
                    actualizarFormulario("region", event.target.value)
                  }
                />
              </label>

              <label>
                OT asociada
                <input
                  value={formulario.codigo_ot}
                  onChange={(event) =>
                    actualizarFormulario("codigo_ot", event.target.value)
                  }
                  placeholder="OT-035"
                />
              </label>

              <label>
                ID OT interno
                <input
                  value={formulario.orden_id}
                  onChange={(event) =>
                    actualizarFormulario("orden_id", event.target.value)
                  }
                  placeholder="Opcional"
                />
              </label>

              <label>
                Origen
                <select
                  value={formulario.origen}
                  onChange={(event) =>
                    actualizarFormulario("origen", event.target.value)
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="venta">Venta</option>
                  <option value="servicio_tecnico">Servicio técnico</option>
                </select>
              </label>

              <label className="span2">
                Observación
                <textarea
                  value={formulario.observacion}
                  onChange={(event) =>
                    actualizarFormulario("observacion", event.target.value)
                  }
                  rows={4}
                  placeholder="Detalle operativo, horario, quién retira, condiciones de despacho, preparación del equipo, etc."
                />
              </label>
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="secondary"
                onClick={() => setMostrarFormulario(false)}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarEvento}
                disabled={guardando}
                className="primary"
              >
                {guardando ? "Guardando..." : "Guardar en agenda"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page {
          padding: 28px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          text-decoration: none;
          color: #334155;
          font-weight: 900;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .backButton:hover {
          color: #2563eb;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          margin-bottom: 20px;
        }

        .breadcrumb {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          font-weight: 800;
        }

        h1 {
          margin: 4px 0;
          font-size: 32px;
          color: #0f172a;
        }

        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.35;
        }

        .headerActions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .primary {
          border: none;
          background: #2563eb;
          color: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }

        .stats div {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
        }

        .stats span {
          display: block;
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .stats strong {
          display: block;
          margin-top: 6px;
          font-size: 26px;
          color: #0f172a;
        }

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .monthControls,
        .filters,
        .quickActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .monthControls button,
        .filters select,
        .quickActions button {
          border: 1px solid #cbd5e1;
          background: white;
          border-radius: 10px;
          padding: 9px 12px;
          font-weight: 800;
          color: #334155;
          cursor: pointer;
        }

        .quickActions {
          margin-bottom: 18px;
        }

        .quickActions button:hover,
        .monthControls button:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .monthControls strong {
          min-width: 180px;
          text-align: center;
          text-transform: capitalize;
          color: #0f172a;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          gap: 18px;
          align-items: start;
        }

        .calendarCard,
        .sideCard {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.05);
        }

        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }

        .weekdays span {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
        }

        .calendar {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .day {
          min-height: 124px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #ffffff;
          padding: 9px;
          text-align: left;
          cursor: pointer;
          overflow: hidden;
        }

        .day.muted {
          opacity: 0.45;
          background: #f8fafc;
        }

        .day.selected {
          border-color: #2563eb;
          box-shadow: 0 0 0 2px #dbeafe;
        }

        .day.today {
          background: #eff6ff;
        }

        .dayTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .dayTop strong {
          color: #0f172a;
          font-size: 15px;
        }

        .dayTop span {
          background: #0f172a;
          color: white;
          font-size: 11px;
          font-weight: 900;
          border-radius: 999px;
          min-width: 22px;
          padding: 3px 7px;
          text-align: center;
        }

        .eventDots {
          display: grid;
          gap: 4px;
        }

        .miniEvent {
          border-radius: 8px;
          padding: 4px 6px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tipoRetiro {
          background: #ecfeff;
          color: #155e75;
        }

        .tipoDespacho {
          background: #fef3c7;
          color: #92400e;
        }

        .tipoTaller {
          background: #ede9fe;
          color: #5b21b6;
        }

        .estadoSolicitado {
          border: 1px solid #bfdbfe;
        }

        .estadoAgendado {
          border: 1px solid #93c5fd;
        }

        .estadoRuta {
          border: 1px solid #fbbf24;
        }

        .estadoRealizado {
          border: 1px solid #86efac;
        }

        .estadoCancelado {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .sideHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }

        .sideHeader span {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .sideHeader h2 {
          margin: 4px 0 0;
          color: #0f172a;
          text-transform: capitalize;
          font-size: 18px;
        }

        .sideHeader button,
        .eventActions button,
        .linkButton {
          border: none;
          background: #e0f2fe;
          color: #0369a1;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
        }

        .empty {
          color: #94a3b8;
          font-size: 14px;
          text-align: center;
          padding: 24px 0;
        }

        .eventList {
          display: grid;
          gap: 12px;
        }

        .eventCard {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          background: #f8fafc;
        }

        .eventHeader {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .pillGroup {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .eventCard h3 {
          margin: 0 0 5px;
          color: #0f172a;
        }

        .eventCard p {
          margin: 3px 0;
          color: #475569;
          font-size: 13px;
          line-height: 1.35;
        }

        .origen {
          font-weight: 900;
          color: #64748b !important;
          font-size: 12px !important;
        }

        .ot {
          font-weight: 900;
          color: #1e3a8a !important;
        }

        .observacion {
          margin-top: 8px !important;
          padding: 8px;
          background: white;
          border-radius: 10px;
          color: #334155 !important;
        }

        .eventActions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .eventActions .success {
          background: #dcfce7;
          color: #166534;
        }

        .eventActions .warning {
          background: #fef3c7;
          color: #92400e;
        }

        .eventActions .danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .modalOverlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .modal {
          width: min(920px, 100%);
          max-height: 92vh;
          overflow: auto;
          background: white;
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.25);
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .modalHeader p {
          margin: 0;
          color: #64748b;
          font-weight: 800;
        }

        .modalHeader h2 {
          margin: 4px 0 0;
          color: #0f172a;
          font-size: 24px;
        }

        .close {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          font-size: 24px;
          cursor: pointer;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        label {
          display: grid;
          gap: 6px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px;
          font-size: 14px;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px #dbeafe;
        }

        .span2 {
          grid-column: span 2;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .secondary {
          border: none;
          background: #f1f5f9;
          color: #334155;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        @media (max-width: 1180px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 800px) {
          .page {
            padding: 18px;
          }

          .header,
          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .calendar {
            grid-template-columns: 1fr;
          }

          .weekdays {
            display: none;
          }

          .day {
            min-height: auto;
          }

          .formGrid {
            grid-template-columns: 1fr;
          }

          .span2 {
            grid-column: span 1;
          }
        }
      `}</style>
    </main>
  );
}
