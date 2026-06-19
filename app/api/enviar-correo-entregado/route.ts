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

    await resend.emails.send({
      from: "MJ Industrial <notificaciones@mjindustrial.cl>",
      to: [email],
      subject: `Pedido entregado${numero ? ` - ${numero}` : ""} | MJ Industrial`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;background:#f4f6f8;color:#111827;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
            <h1 style="color:#16a34a;">Pedido entregado</h1>

            <p>Hola,</p>

            <p>Tu pedido ha sido entregado correctamente.</p>

            <p><strong>Producto:</strong> ${producto || "-"}</p>
            <p><strong>Número:</strong> ${numero || "-"}</p>

            <br />

            <p>Gracias por confiar en MJ Industrial.</p>

            <p style="font-size:12px;color:#6b7280;margin-top:26px;">
              Este correo fue enviado automáticamente por MJ Industrial.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "Error enviando correo de entrega." },
      { status: 500 }
    );
  }
}