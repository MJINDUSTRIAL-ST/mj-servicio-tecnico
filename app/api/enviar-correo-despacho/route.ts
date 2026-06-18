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

    const { email, producto, numero } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Falta email." },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: `Solicitud de despacho recibida${numero ? ` - ${numero}` : ""}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2>Solicitud de despacho recibida</h2>

          <p>Hemos recibido correctamente tu solicitud de despacho.</p>

          <p><strong>Producto:</strong> ${producto || "-"}</p>
          <p><strong>Número de venta:</strong> ${numero || "-"}</p>

          <p>
            Nuestro equipo coordinará la entrega y te enviará un correo
            de confirmación con la fecha y horario estimado de despacho.
          </p>

          <br />

          <p>
            Saludos,<br />
            MJ Industrial
          </p>
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
      { success: false, error: "Error interno enviando correo de despacho." },
      { status: 500 }
    );
  }
}