import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "personal@mjindustrial.cl";
const PORTAL_URL = "https://clientes-mj.com";

type CreateInternalUserBody = {
  name?: string;
  email?: string;
  jobTitle?: string;
  roleKey?: string;
};

const ALLOWED_ROLES = [
  "administrador",
  "gerencia",
  "jefe_tecnico",
  "tecnico",
  "vendedor",
  "logistica",
  "solo_lectura",
] as const;

function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  const random = randomBytes(10);

  let generatedPart = "";

  for (let index = 0; index < random.length; index += 1) {
    generatedPart += alphabet[random[index] % alphabet.length];
  }

  return `MJ!${generatedPart}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRoleLabel(roleKey: string): string {
  const roleLabels: Record<string, string> = {
    administrador: "Administrador",
    gerencia: "Gerencia",
    jefe_tecnico: "Jefe técnico",
    tecnico: "Técnico",
    vendedor: "Vendedor",
    logistica: "Logística",
    solo_lectura: "Solo lectura",
  };

  return roleLabels[roleKey] ?? roleKey;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

    if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Configuración incompleta.",
        debug: {
          supabaseUrl: !!supabaseUrl,
          supabaseAnonKey: !!supabaseAnonKey,
          serviceRole: !!supabaseServiceRoleKey,
        },
      },
      {
        status: 500,
      },
    );
  }

  const authorizationHeader =
    request.headers.get("authorization") ?? "";

  const accessToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: "No existe una sesión válida.",
      },
      {
        status: 401,
      },
    );
  }

  const supabaseSessionClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabaseSessionClient.auth.getUser(accessToken);

  if (currentUserError || !currentUser) {
    return NextResponse.json(
      {
        success: false,
        error: "La sesión no es válida o ha expirado.",
      },
      {
        status: 401,
      },
    );
  }

  const currentUserEmail =
    currentUser.email?.trim().toLowerCase() ?? "";

  if (currentUserEmail !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No tienes autorización para crear usuarios internos.",
      },
      {
        status: 403,
      },
    );
  }

  let body: CreateInternalUserBody;

  try {
    body = (await request.json()) as CreateInternalUserBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Los datos enviados no son válidos.",
      },
      {
        status: 400,
      },
    );
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const jobTitle = body.jobTitle?.trim() ?? "";
  const roleKey = body.roleKey?.trim() ?? "";

  if (!name) {
    return NextResponse.json(
      {
        success: false,
        error: "Debes ingresar el nombre del usuario.",
      },
      {
        status: 400,
      },
    );
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      {
        success: false,
        error: "Debes ingresar un correo válido.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    !ALLOWED_ROLES.includes(
      roleKey as (typeof ALLOWED_ROLES)[number],
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "El rol seleccionado no es válido.",
      },
      {
        status: 400,
      },
    );
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: existingInternalUser } = await supabaseAdmin
    .from("internal_users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (existingInternalUser) {
    return NextResponse.json(
      {
        success: false,
        error: "Ese correo ya está registrado como usuario interno.",
      },
      {
        status: 409,
      },
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  const {
    data: createdAuthUser,
    error: createAuthUserError,
  } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      name,
      job_title: jobTitle,
      role_key: roleKey,
      user_type: "internal",
    },
  });

  if (createAuthUserError || !createdAuthUser.user) {
    const errorMessage =
      createAuthUserError?.message ??
      "No fue posible crear el acceso del usuario.";

    const normalizedError = errorMessage.toLowerCase();

    if (
      normalizedError.includes("already") ||
      normalizedError.includes("registered") ||
      normalizedError.includes("exists")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ese correo ya tiene un usuario creado en Supabase Authentication.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
      },
    );
  }

  const authUserId = createdAuthUser.user.id;

  const {
    data: internalUser,
    error: createInternalUserError,
  } = await supabaseAdmin
    .from("internal_users")
    .insert({
      auth_user_id: authUserId,
      name,
      email,
      job_title: jobTitle,
      role_key: roleKey,
      is_active: true,
    })
    .select(
      "id, auth_user_id, name, email, job_title, role_key, is_active",
    )
    .single();

  if (createInternalUserError || !internalUser) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);

    return NextResponse.json(
      {
        success: false,
        error:
          createInternalUserError?.message ??
          "No fue posible guardar el perfil interno.",
      },
      {
        status: 500,
      },
    );
  }

  let emailSent = false;
  let emailWarning = "";

  if (!resendApiKey) {
    emailWarning =
      "El usuario fue creado, pero falta configurar RESEND_API_KEY.";
  } else {
    const resend = new Resend(resendApiKey);

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeJobTitle = escapeHtml(jobTitle);
    const safeRole = escapeHtml(getRoleLabel(roleKey));
    const safePassword = escapeHtml(temporaryPassword);

    const { error: resendError } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: "Bienvenido al portal interno de MJ Industrial",
      html: `
        <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827;">
          <div style="max-width:680px;margin:0 auto;padding:24px;">
            <div style="background:#111827;border-radius:16px 16px 0 0;padding:28px;text-align:center;">
              <img
                src="https://mjindustrial.cl/wp-content/uploads/2025/11/imgi_22_logo-web_Mesa-de-trabajo-1.png"
                alt="MJ Industrial"
                style="max-width:220px;height:auto;"
              />
            </div>

            <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
              <h1 style="margin:0 0 12px;color:#f97316;font-size:24px;">
                Bienvenido al portal interno
              </h1>

              <p style="line-height:1.6;">
                Hola ${safeName},
              </p>

              <p style="line-height:1.6;">
                Se creó tu acceso al sistema interno de MJ Industrial.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:18px 0;">
                <p style="margin:0 0 10px;">
                  <strong>Correo:</strong> ${safeEmail}
                </p>

                ${
                  safeJobTitle
                    ? `
                      <p style="margin:0 0 10px;">
                        <strong>Cargo:</strong> ${safeJobTitle}
                      </p>
                    `
                    : ""
                }

                <p style="margin:0 0 10px;">
                  <strong>Rol:</strong> ${safeRole}
                </p>

                <p style="margin:0;">
                  <strong>Contraseña temporal:</strong>
                  <span style="display:inline-block;background:#dcfce7;color:#166534;padding:6px 12px;border-radius:999px;font-weight:700;">
                    ${safePassword}
                  </span>
                </p>
              </div>

              <p style="line-height:1.6;">
                Por seguridad, cambia esta contraseña después de ingresar.
              </p>

              <a
                href="${PORTAL_URL}"
                target="_blank"
                rel="noreferrer"
                style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;"
              >
                Ingresar al portal
              </a>

              <p style="font-size:12px;line-height:1.5;color:#6b7280;margin-top:26px;">
                Este correo fue enviado automáticamente por MJ Industrial.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (resendError) {
      console.error(
        "Error enviando bienvenida de usuario interno:",
        resendError,
      );

      emailWarning =
        "El usuario fue creado, pero el correo de bienvenida no pudo enviarse.";
    } else {
      emailSent = true;
    }
  }

  return NextResponse.json(
    {
      success: true,
      user: internalUser,
      temporaryPassword,
      emailSent,
      warning: emailWarning || null,
    },
    {
      status: 201,
    },
  );
}