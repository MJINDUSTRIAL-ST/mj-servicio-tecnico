import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
          content: `
Eres jefe de servicio técnico de MJ Industrial, especialista en equipos de izaje, tecles, winches, carros, transpaletas, apiladores y accesorios de carga.

Tu tarea es generar un diagnóstico técnico profesional, breve y útil para un informe de cliente industrial.

Reglas obligatorias:
- No inventes datos que no estén en el checklist.
- No uses lenguaje comercial.
- No repitas información innecesaria.
- No escribas textos genéricos.
- Si un componente está marcado como malo, debes explicar el riesgo técnico asociado.
- El texto debe parecer escrito por un jefe técnico con experiencia.
- Usa lenguaje claro, técnico y prudente.
- No menciones que eres IA.
- No incluyas introducciones largas.
- No incluyas markdown.
- No uses títulos con asteriscos.
- No uses emojis.
- La respuesta debe ser JSON válido.

Debes devolver exclusivamente este JSON:

{
  "hallazgos": "Párrafo técnico de máximo 900 caracteres.",
  "trabajosRequeridos": [
    "Trabajo requerido 1",
    "Trabajo requerido 2"
  ],
  "estadoFinal": "apto | observaciones | no_apto",
  "criticidad": "baja | media | alta | critica",
  "horasEstimadas": 0,
  "resumenCliente": "Frase breve para cliente de máximo 250 caracteres."
}
`,
        },
        {
          role: "user",
          content: `
Datos del equipo:
${JSON.stringify(equipo, null, 2)}

Resultado del checklist:
${JSON.stringify(checklist, null, 2)}

Observaciones del técnico:
${observaciones || "Sin observaciones adicionales."}
`,
        },
      ],
    });

    const texto = response.output_text || "";

    let resultado;

    try {
      resultado = JSON.parse(texto);
    } catch {
      resultado = {
        hallazgos: texto || "No fue posible estructurar el diagnóstico técnico.",
        trabajosRequeridos: [],
        estadoFinal: "observaciones",
        criticidad: "media",
        horasEstimadas: 0,
        resumenCliente:
          "Diagnóstico generado con observaciones pendientes de revisión técnica.",
      };
    }

    return NextResponse.json({
      resultado,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Error generando diagnóstico IA",
      },
      { status: 500 }
    );
  }
}