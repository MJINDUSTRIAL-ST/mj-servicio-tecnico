import { NextResponse } from "next/server";
import { Resend } from "resend";

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

    const resend = new Resend(apiKey);
    const body = await req.json();

    const { email, cliente, codigo, producto, ordenId } = body;

    if (!email || !codigo || !ordenId) {
      return NextResponse.json(
        { success: false, error: "Falta email, código u ordenId." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.clientes-mj.com";

    const portalUrl = `${baseUrl}/cliente/portal/servicio-tecnico/${ordenId}`;

    const { data, error } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: `Equipo listo para retiro o despacho - ${codigo} | MJ Industrial`,
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
                Tu equipo está listo
              </h1>

              <p>Hola ${cliente || "Cliente"},</p>

              <p>
                Te informamos que la orden de servicio <strong>${codigo}</strong>
                ya se encuentra lista para coordinar retiro o despacho.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:18px 0;">
                <p style="margin:0 0 10px;">
                  <strong>Orden:</strong> ${codigo}
                </p>

                <p style="margin:0;">
                  <strong>Equipo:</strong> ${producto || "-"}
                </p>
              </div>

              <p style="line-height:1.5;">
                Puedes ingresar al portal para revisar el estado de la orden y coordinar
                si retirarás el equipo en taller o si necesitas despacho.
              </p>

              <a
                href="${portalUrl}"
                target="_blank"
                style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;margin-top:10px;"
              >
                Coordinar retiro o despacho
              </a>

              <p style="font-size:12px;line-height:1.5;color:#6b7280;margin-top:26px;">
                Este correo fue enviado automáticamente por MJ Industrial.
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
      {
        success: false,
        error: "Error interno enviando correo de equipo listo.",
      },
      { status: 500 }
    );
  }
}