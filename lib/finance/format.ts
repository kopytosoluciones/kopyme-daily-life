const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function fmt(n: number, decimals = 0): string {
  const abs = Math.abs(n).toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (n < 0 && abs !== "0" ? "−" : "") + abs;
}

/** Hasta 2 decimales, solo si hacen falta. */
export function fmtAmount(n: number): string {
  return Number.isInteger(n) ? fmt(n) : fmt(n, 2);
}

export function fmtSigned(n: number): string {
  const r = Math.round(n);
  return (r > 0 ? "+" : "") + fmt(r);
}

export function fmtUsd(n: number): string {
  return "US$ " + fmt(Math.round(n));
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

export function monthLong(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/**
 * Acepta formato es-AR ("1.234,56"), con punto decimal ("1234.56") o sin separadores.
 * Sin coma, un punto seguido de exactamente 3 dígitos se toma como separador de miles.
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/\s|US\$|\$/g, "").replace("−", "-");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
