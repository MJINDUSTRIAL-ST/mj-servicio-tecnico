import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = body.email;
    const producto = body.producto;
    const numero = body.numero;

    await resend.emails.send({
      from: "MJ Industrial <noreply@mjindustrial.cl>",
      to: [email],
      subject: `Solicitud de despacho recibida - ${numero}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2>Solicitud de despacho recibida</h2>

          <p>
            Hemos recibido correctamente tu solicitud de despacho.
          </p>

          <p>
            <strong>Producto:</strong> ${producto}
          </p>

          <p>
            <strong>Número de venta:</strong> ${numero}
          </p>

          <p>
            Nuestro equipo coordinará la entrega y te enviará un correo
            de confirmación con la fecha y horario estimado de despacho.
          </p>

          <br>

          <p>
            Saludos,<br>
            MJ Industrial
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}