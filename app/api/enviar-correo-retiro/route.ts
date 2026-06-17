import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL");
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
      nombre,
      productoEquipo,
      fechaRetiro,
      horaRetiro,
      observaciones,
      tipo,
    } = body;

    if (!email || !fechaRetiro || !horaRetiro) {
      return NextResponse.json(
        { success: false, error: "Falta email, fecha u hora de retiro." },
        { status: 400 }
      );
    }

    const asunto =
      tipo === "servicio-tecnico"
        ? "Retiro de equipo agendado | MJ Industrial"
        : "Retiro de compra agendado | MJ Industrial";

    const { data, error } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: asunto,
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
                Retiro agendado correctamente
              </h1>

              <p>Hola ${nombre || "Cliente"},</p>

              <p>Tu retiro fue agendado correctamente en MJ Industrial.</p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin:18px 0;">
                <p style="margin:0 0 10px;">
                  <strong>Producto / equipo:</strong> ${productoEquipo || "-"}
                </p>

                <p style="margin:0 0 10px;">
                  <strong>Fecha de retiro:</strong> ${formatFecha(fechaRetiro)}
                </p>

                <p style="margin:0 0 10px;">
                  <strong>Hora:</strong> ${horaRetiro}
                </p>

                ${
                  observaciones
                    ? `<p style="margin:0;"><strong>Observaciones:</strong> ${observaciones}</p>`
                    : ""
                }
              </div>

              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px;margin:18px 0;">
                <p style="margin:0;color:#9a3412;font-weight:700;">
                  Importante
                </p>
                <p style="margin:8px 0 0;color:#9a3412;line-height:1.5;">
                  Te recomendamos presentarte dentro del horario agendado. Si otra persona retira por ti, debe indicar el nombre registrado en las observaciones.
                </p>
              </div>

              <a
                href="https://mj-servicio-tecnico.vercel.app/cliente"
                target="_blank"
                style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;"
              >
                Ver en mi portal
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
      { success: false, error: "Error interno enviando correo de retiro." },
      { status: 500 }
    );
  }
}