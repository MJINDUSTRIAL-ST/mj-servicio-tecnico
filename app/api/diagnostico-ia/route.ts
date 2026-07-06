import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Falta configurar OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const body = await request.json();

    const { equipo, checklist, observaciones } = body;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Eres un jefe de servicio técnico experto en equipos de izaje de MJ Industrial. Genera diagnósticos técnicos claros, prudentes y útiles. No inventes datos. Si falta información, indícalo.",
        },
        {
          role: "user",
          content: `
Equipo:
${JSON.stringify(equipo, null, 2)}

Checklist:
${JSON.stringify(checklist, null, 2)}

Observaciones:
${observaciones || "Sin observaciones adicionales."}

Devuelve una respuesta en español con este formato:

Diagnóstico técnico:
Causa probable:
Riesgos:
Trabajo recomendado:
Repuestos sugeridos:
Horas estimadas:
Prioridad:
`,
        },
      ],
    });

    return NextResponse.json({
      resultado: response.output_text,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error: error.message || "Error generando diagnóstico IA",
      },
      { status: 500 }
    );
  }
}