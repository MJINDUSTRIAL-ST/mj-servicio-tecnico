import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta configurar RESEND_API_KEY en Vercel.",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const body = await req.json();

    const { email, cliente, numeroVenta, estado, comentario } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta el email del cliente.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: `Actualización de venta ${numeroVenta || ""}`,
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
                Actualización de venta
              </h1>

              <p style="font-size:15px;line-height:1.6;margin:0 0 14px;">
                Hola ${cliente || "Cliente"},
              </p>

              <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
                Tu venta ha sido actualizada correctamente.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:18px 0;">
                <p style="margin:0 0 10px;font-size:15px;">
                  <strong>Número:</strong> ${numeroVenta || "-"}
                </p>

                <p style="margin:0 0 10px;font-size:15px;">
                  <strong>Estado actual:</strong>
                  <span style="display:inline-block;background:#dcfce7;color:#166534;padding:5px 10px;border-radius:999px;font-weight:700;font-size:13px;">
                    ${estado || "-"}
                  </span>
                </p>

                ${
                  comentario
                    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.6;">
                        <strong>Comentario:</strong> ${comentario}
                      </p>`
                    : ""
                }
              </div>

              <p style="font-size:15px;line-height:1.6;margin:22px 0 0;">
                Gracias por confiar en <strong>MJ Industrial</strong>.
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0;" />

              <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:0;">
                Este correo fue enviado automáticamente por el sistema de seguimiento de ventas y servicios de MJ Industrial.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno enviando correo.",
      },
      { status: 500 }
    );
  }
}