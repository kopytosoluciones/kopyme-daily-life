import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureCurrentMonths } from "@/lib/supabase/finance";
import { BASE_CURRENCY, todayKey } from "@/lib/finance/calc";
import { monthLong } from "@/lib/finance/format";

export type Notice = {
  id: string;
  area: string;
  text: string;
  href: string;
};

const DIARY_GAP_DAYS = 5;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

/**
 * Avisos derivados de los datos: no se guardan, desaparecen cuando se resuelve lo que piden.
 * Antes de calcularlos crea los meses de Combustible que falten.
 */
export const getNotices = cache(async (userId: string): Promise<Notice[]> => {
  await ensureCurrentMonths(userId);
  const supabase = await createClient();

  const [months, wallets, diary] = await Promise.all([
    supabase.from("finance_months").select("id, month, reviewed_at, fx_rates").order("month"),
    supabase.from("finance_wallets").select("currency, archived_at"),
    supabase
      .from("diary_entries")
      .select("entry_date")
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const notices: Notice[] = [];

  for (const m of months.data ?? []) {
    if (!m.reviewed_at)
      notices.push({
        id: `finance-review-${m.id}`,
        area: "Combustible",
        text: `Actualizá ${monthLong(m.month)}: saldos, ingreso y gasto. Después marcalo ✓ listo.`,
        href: "/combustible",
      });
  }

  const last = months.data?.at(-1);
  if (last) {
    const fx = (last.fx_rates ?? {}) as Record<string, unknown>;
    const foreign = new Set(
      (wallets.data ?? []).filter((w) => !w.archived_at && w.currency !== BASE_CURRENCY).map((w) => w.currency),
    );
    for (const cur of foreign)
      if (!(Number(fx[cur]) > 0))
        notices.push({
          id: `finance-fx-${last.id}-${cur}`,
          area: "Combustible",
          text: `Falta el tipo de cambio ${cur}/USD de ${monthLong(last.month)}.`,
          href: "/combustible",
        });
  }

  if (diary.data?.entry_date) {
    const gap = daysBetween(diary.data.entry_date, todayKey());
    if (gap >= DIARY_GAP_DAYS)
      notices.push({
        id: "diary-gap",
        area: "Diario",
        text: `Hace ${gap} días que no escribís. ¿Pasó algo?`,
        href: "/diary",
      });
  }

  return notices;
});
