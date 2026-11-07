import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MODEL = process.env.OPENAI_MODEL_DIAGNOSTICO || "gpt-4o-mini";

type DatosInforme = {
  equipo?: Record<string, unknown>;
  problemaReportado?: string;
  diagnostico?: Record<string, unknown>;
  procedimientoAprobado?: string;
  trabajo?: Record<string, unknown>;
};

function texto(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 12000) : "";
}

function objeto(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function booleano(value: unknown): boolean {
  return value === true;
}

// Acceso únicamente para personal interno activo con permisos técnicos.
const ROLES_AUTORIZADOS = new Set([
  "administrador",
  "gerencia",
  "jefe_tecnico",
  "tecnico",
]);

async function validarUsuarioInterno(request: NextRequest): Promise<NextResponse | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Configuración de seguridad incompleta." }, { status: 503 });
  }

  const cabecera = request.headers.get("authorization") || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Debes iniciar sesión para utilizar esta función." }, { status: 401 });
  }

  const clienteAuth = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: auth, error: errorAuth } = await clienteAuth.auth.getUser(token);
  if (errorAuth || !auth.user) {
    return NextResponse.json({ ok: false, error: "Sesión inválida o expirada." }, { status: 401 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: perfil, error: errorPerfil } = await admin
    .from("internal_users")
    .select("auth_user_id,role_key,is_active")
    .eq("auth_user_id", auth.user.id)
    .maybeSingle();
  if (errorPerfil) {
    console.error("No se pudo validar el perfil interno:", errorPerfil);
    return NextResponse.json({ ok: false, error: "No se pudo comprobar tu autorización." }, { status: 503 });
  }

  // La cuenta administradora original puede preceder a internal_users.
  // Solo se admite esa excepción si coincide con el correo administrativo existente.
  const esAdministradorPrincipal =
    auth.user.email?.trim().toLowerCase() === "personal@mjindustrial.cl";
  const autorizado = perfil
    ? perfil.is_active === true && ROLES_AUTORIZADOS.has(perfil.role_key)
    : esAdministradorPrincipal;
  if (!autorizado) {
    return NextResponse.json({ ok: false, error: "No tienes permisos para generar informes técnicos con IA." }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const rechazo = await validarUsuarioInterno(request);
    if (rechazo) return rechazo;

    const raw = await request.text();
    if (raw.length > 60000) {
      return NextResponse.json({ ok: false, error: "La solicitud es demasiado grande." }, { status: 413 });
    }

    let payload: DatosInforme;
    try {
      payload = JSON.parse(raw) as DatosInforme;
    } catch {
      return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
    }

    const equipo = objeto(payload.equipo);
    const diagnostico = objeto(payload.diagnostico);
    const trabajo = objeto(payload.trabajo);

    const trabajoRealizado = texto(trabajo.trabajo_realizado);
    const observaciones = texto(trabajo.observaciones);
    const tieneAcciones = [
      "repuestos_cambiados",
      "reparaciones_realizadas",
      "ajustes_realizados",
      "mantencion_limpieza_realizada",
    ].some((campo) => booleano(trabajo[campo]));

    if (!trabajoRealizado && !observaciones && !tieneAcciones) {
      return NextResponse.json(
        { ok: false, error: "Primero registra el trabajo efectivamente realizado." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "No está configurada la conexión con OpenAI." },
        { status: 503 },
      );
    }

    const datos = {
      equipo: {
        tipo: texto(equipo.tipo),
        marca: texto(equipo.marca),
        modelo: texto(equipo.modelo),
        numero_serie: texto(equipo.numero_serie),
      },
      problemaReportado: texto(payload.problemaReportado),
      diagnostico: {
        hallazgos: texto(diagnostico.hallazgos),
        procedimiento: texto(diagnostico.procedimiento),
        repuestos: texto(diagnostico.repuestos),
      },
      procedimientoAprobado: texto(payload.procedimientoAprobado),
      trabajo: {
        trabajo_realizado: trabajoRealizado,
        observaciones,
        repuestos_utilizados: texto(trabajo.repuestos_utilizados),
        repuestos_cambiados: booleano(trabajo.repuestos_cambiados),
        reparaciones_realizadas: booleano(trabajo.reparaciones_realizadas),
        ajustes_realizados: booleano(trabajo.ajustes_realizados),
        mantencion_limpieza_realizada: booleano(trabajo.mantencion_limpieza_realizada),
        prueba_funcional: booleano(trabajo.prueba_funcional),
        prueba_carga: booleano(trabajo.prueba_carga),
        equipo_liberado: booleano(trabajo.equipo_liberado),
        resultado_final: texto(trabajo.resultado_final),
      },
    };

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Eres redactor de informes de Servicio Técnico de MJ Industrial, especialista en equipos de izaje. Redacta en español de Chile con lenguaje técnico profesional y preciso. Usa SOLO los hechos registrados. Distingue claramente diagnóstico y procedimientos RECOMENDADOS del trabajo REALMENTE EJECUTADO. Nunca afirmes que se cambió un repuesto solo porque fue solicitado, ni que se efectuaron pruebas por figurar en un procedimiento recomendado. Las pruebas sólo pueden presentarse como realizadas cuando sus respectivos indicadores sean true. No inventes mediciones, capacidades, porcentajes, normas, certificados, conclusiones de aptitud ni liberación. Si el estado es pendiente o faltan pruebas, expresa esa limitación y NO declares el equipo apto. No atribuyas causas o resultados no documentados. Devuelve exclusivamente un objeto JSON con estas claves de tipo string: resumenTecnico, trabajosEjecutados, pruebasYVerificaciones, condicionFinal, pendientesYObservaciones. Sé breve pero específico. El informe será un BORRADOR sujeto a revisión y aprobación del responsable técnico.`,
        },
        {
          role: "user",
          content: JSON.stringify(datos),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("La IA no entregó contenido.");
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const campos = [
      "resumenTecnico",
      "trabajosEjecutados",
      "pruebasYVerificaciones",
      "condicionFinal",
      "pendientesYObservaciones",
    ] as const;
    const informe = Object.fromEntries(campos.map((campo) => [campo, texto(parsed[campo])]));

    if (!informe.resumenTecnico || !informe.condicionFinal) {
      throw new Error("La IA no generó un resumen técnico válido.");
    }

    return NextResponse.json({ ok: true, informe, estado: "borrador", fuente: "openai" });
  } catch (error) {
    console.error("Error generando borrador técnico:", error);
    return NextResponse.json(
      { ok: false, error: "No se pudo generar el borrador técnico final." },
      { status: 500 },
    );
  }
}
