"use server";

import Anthropic from "@anthropic-ai/sdk";

export interface AnalysisEntry {
  date: string;
  mood: number | null;
  emoji: string | null;
  body: string;
}

export async function analyzeEmotions(
  entries: AnalysisEntry[],
  displayName: string,
): Promise<{ analysis: string | null; error: string | null }> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    if (entries.length === 0) {
      return { analysis: null, error: "No hay registros suficientes para analizar." };
    }

    const registros = entries
      .map(e => {
        const partes = [`- ${e.date}: puntaje ${e.mood ?? "sin puntaje"}`];
        if (e.emoji) partes.push(e.emoji);
        if (e.body.trim()) partes.push(`"${e.body.trim()}"`);
        return partes.join(" — ");
      })
      .join("\n");

    const prompt = `Tenés acceso a los registros del diario emocional de ${displayName} de los últimos 14 días. Cada entrada tiene fecha, puntaje emocional del 1 al 10, y un texto que escribió.

Registros:
${registros}

Escribí un análisis breve de 3-4 párrafos con estas características:
- En tercera persona, como si un observador externo describiera las últimas dos semanas de ${displayName}
- Tono cálido, humano y ligero — nada clínico ni terapéutico
- Incluí: cómo parece haberse sentido, tendencias emocionales, qué temas parecen haber sido importantes (relaciones, trabajo, salud, proyectos personales, metas, o cualquier otro tema recurrente detectado), qué estuvo atravesando o viviendo
- Terminá con una recomendación suave y positiva basada en lo observado
- Sin diagnósticos ni afirmaciones categóricas
- Respondé directamente con el análisis, sin títulos ni listas`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : null;
    return { analysis: text, error: null };
  } catch (e) {
    return { analysis: null, error: e instanceof Error ? e.message : "Error al analizar." };
  }
}
