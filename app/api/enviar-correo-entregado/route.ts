import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function escaparHtml(valor?: string | null) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatFechaHora(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL");
  } catch {
    return fecha;
  }
}

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

    const {
      email,
      cliente,
      producto,
      numero,
      recibidoPor,
      fechaEntrega,
      fotoUrl,
      observacion,
    } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Falta email." },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: `Pedido entregado${numero ? ` - ${numero}` : ""} | MJ Industrial`,
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
              <h1 style="margin:0 0 12px;color:#16a34a;font-size:24px;">
                Entrega registrada
              </h1>

              <p>Hola ${escaparHtml(cliente) || "Cliente"},</p>

              <p>Te confirmamos que tu equipo fue entregado correctamente.</p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:18px 0;">
                <p style="margin:0 0 10px;">
                  <strong>Producto:</strong> ${escaparHtml(producto) || "-"}
                </p>

                <p style="margin:0 0 10px;">
                  <strong>Orden:</strong> ${escaparHtml(numero) || "-"}
                </p>

                <p style="margin:0 0 10px;">
                  <strong>Recibido por:</strong> ${escaparHtml(recibidoPor) || "-"}
                </p>

                <p style="margin:0;">
                  <strong>Fecha de entrega:</strong> ${escaparHtml(
                    formatFechaHora(fechaEntrega)
                  )}
                </p>
              </div>

              ${
                observacion
                  ? `<p style="line-height:1.5;"><strong>Observación:</strong><br />${escaparHtml(
                      observacion
                    )}</p>`
                  : ""
              }

              ${
                fotoUrl
                  ? `<a
                      href="${escaparHtml(fotoUrl)}"
                      target="_blank"
                      style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;margin-top:10px;"
                    >
                      Ver foto de entrega
                    </a>`
                  : ""
              }

              <p style="margin-top:24px;line-height:1.5;">
                Gracias por confiar en MJ Industrial.
              </p>

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
      { success: false, error: "Error enviando correo de entrega." },
      { status: 500 }
    );
  }
}