import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Falta configurar RESEND_API_KEY." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Debes ingresar un correo." },
        { status: 400 }
      );
    }

    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("nombre, email, codigo_acceso")
      .eq("email", email)
      .limit(1)
      .single();

    if (clienteError || !cliente || !cliente.codigo_acceso) {
      return NextResponse.json({
        success: true,
        message: "Si el correo existe, enviaremos el código de acceso.",
      });
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: "Recuperación de código de acceso MJ Industrial",
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
                Recuperación de acceso
              </h1>

              <p>Hola ${cliente.nombre || "Cliente"},</p>

              <p>Solicitaste recuperar tu código para ingresar al portal de clientes de MJ Industrial.</p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:18px 0;">
                <p style="margin:0 0 10px;">
                  <strong>Correo:</strong> ${email}
                </p>

                <p style="margin:0;">
                  <strong>Código de acceso:</strong>
                  <span style="display:inline-block;background:#dcfce7;color:#166534;padding:6px 12px;border-radius:999px;font-weight:700;">
                    ${cliente.codigo_acceso}
                  </span>
                </p>
              </div>

              <a
                href="https://mj-servicio-tecnico.vercel.app/cliente"
                target="_blank"
                style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;"
              >
                Ingresar al portal
              </a>

              <p style="font-size:12px;line-height:1.5;color:#6b7280;margin-top:26px;">
                Si no solicitaste este código, puedes ignorar este correo.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "Error interno recuperando código." },
      { status: 500 }
    );
  }
}