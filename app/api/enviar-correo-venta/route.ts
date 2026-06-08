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
      subject: `Actualización de venta ${numeroVenta}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>MJ Industrial</h2>

          <p>Hola ${cliente || "Cliente"},</p>

          <p>Tu venta ha sido actualizada.</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
            <p><strong>Número:</strong> ${numeroVenta || "-"}</p>
            <p><strong>Estado:</strong> ${estado || "-"}</p>
            ${
              comentario
                ? `<p><strong>Comentario:</strong> ${comentario}</p>`
                : ""
            }
          </div>

          <p>Gracias por confiar en MJ Industrial.</p>
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