"use client";

type EggStage = "egg" | "cracking" | "hatching" | "emerging" | "self";

interface EggProps {
  stage?: EggStage;
  message?: string;
}

const stageMessages: Record<EggStage, string> = {
  egg: "Hola. Soy tu huevo. Todavía no sé quién soy... pero vos me vas a ayudar a descubrirlo.",
  cracking: "Algo está pasando. Siento que me estoy despertando.",
  hatching: "Ya casi. Puedo ver la luz.",
  emerging: "Estoy tomando forma. Esto que ves soy yo.",
  self: "Acá estoy. Gracias por encontrarme.",
};

const stageBadge: Record<EggStage, string> = {
  egg: "descubriéndote",
  cracking: "algo se mueve",
  hatching: "casi listo",
  emerging: "tomando forma",
  self: "sos vos",
};

const CRACKED: EggStage[] = ["cracking", "hatching", "emerging", "self"];
const OPEN: EggStage[] = ["hatching", "emerging", "self"];

/** Avatar v2: huevo en línea (2px, tokens), sin degradés ni sombras. Funciona igual en claro y oscuro. */
export default function Egg({ stage = "egg", message }: EggProps) {
  const displayMessage = message || stageMessages[stage];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg width="160" height="200" viewBox="0 0 160 200" fill="none" aria-label={`Avatar: ${stageBadge[stage]}`} role="img">
          <ellipse cx="80" cy="110" rx="62" ry="78" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2.5" />

          {/* Brillo: trazo corto en vez de degradé */}
          <path d="M52 70 Q58 58 68 54" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="square" />

          {/* Grietas */}
          {CRACKED.includes(stage) && (
            <g stroke="var(--foreground)" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M80 60 L74 75 L82 85 L76 100" />
              <path d="M82 85 L90 90" />
            </g>
          )}
          {OPEN.includes(stage) && (
            <g stroke="var(--foreground)" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M55 110 L62 120 L55 132" />
              <path d="M105 105 L98 118 L108 128" />
            </g>
          )}

          {/* Pintitas como píxeles */}
          <rect x="93" y="143" width="4" height="4" fill="var(--muted-foreground)" />
          <rect x="64" y="154" width="3" height="3" fill="var(--muted-foreground)" />
          <rect x="104" y="129" width="3" height="3" fill="var(--muted-foreground)" />
        </svg>

        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-2 border-foreground bg-card px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase">
          {stageBadge[stage]}
        </div>
      </div>

      {/* Burbuja: caja v2 con pico hecho de dos triángulos (borde + relleno) */}
      <div className="relative max-w-xs">
        <div aria-hidden className="absolute -top-[11px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-b-[11px] border-x-transparent border-b-foreground" />
        <div aria-hidden className="absolute -top-[7px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-card" />
        <div className="border-2 border-foreground bg-card px-5 py-3.5">
          <p className="text-center text-sm leading-relaxed">&ldquo;{displayMessage}&rdquo;</p>
        </div>
      </div>
    </div>
  );
}
