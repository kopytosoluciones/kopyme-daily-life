"use client";

type EggStage = "egg" | "cracking" | "hatching" | "emerging" | "self";

interface EggProps {
  stage?: EggStage;
  points?: number;
  message?: string;
}

const stageMessages: Record<EggStage, string> = {
  egg: "Hola. Soy tu huevo. Todavía no sé quién soy... pero vos me vas a ayudar a descubrirlo.",
  cracking: "Algo está pasando. Siento que me estoy despertando.",
  hatching: "Ya casi. Puedo ver la luz.",
  emerging: "Estoy tomando forma. Esto que ves soy yo.",
  self: "Acá estoy. Gracias por encontrarme.",
};

export default function Egg({ stage = "egg", message }: EggProps) {
  const displayMessage = message || stageMessages[stage];

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative"
        style={{
          animation: "egg-breathe 3s ease-in-out infinite, egg-glow 3s ease-in-out infinite, float 6s ease-in-out infinite",
        }}
      >
        <svg
          width="160"
          height="200"
          viewBox="0 0 160 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Egg body */}
          <ellipse
            cx="80"
            cy="110"
            rx="62"
            ry="78"
            fill="url(#eggGradient)"
            stroke="#E2D9C8"
            strokeWidth="1.5"
          />

          {/* Egg inner glow */}
          <ellipse
            cx="80"
            cy="105"
            rx="42"
            ry="55"
            fill="url(#innerGlow)"
            opacity="0.5"
          />

          {/* Highlight */}
          <ellipse
            cx="62"
            cy="75"
            rx="14"
            ry="18"
            fill="white"
            opacity="0.35"
            transform="rotate(-15 62 75)"
          />

          {/* Cracks — appear per stage */}
          {(stage === "cracking" || stage === "hatching" || stage === "emerging" || stage === "self") && (
            <g stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" fill="none"
               style={{ animation: "crack-appear 1s ease forwards", strokeDasharray: 100 }}>
              <path d="M80 60 L74 75 L82 85 L76 100" />
              <path d="M82 85 L90 90" />
            </g>
          )}
          {(stage === "hatching" || stage === "emerging" || stage === "self") && (
            <g stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" fill="none"
               style={{ animation: "crack-appear 1.2s ease forwards", strokeDasharray: 100 }}>
              <path d="M55 110 L62 120 L55 132" />
              <path d="M105 105 L98 118 L108 128" />
            </g>
          )}

          {/* Speckles */}
          <circle cx="95" cy="145" r="2.5" fill="#D4C9B8" opacity="0.6" />
          <circle cx="65" cy="155" r="1.8" fill="#D4C9B8" opacity="0.5" />
          <circle cx="105" cy="130" r="1.5" fill="#D4C9B8" opacity="0.4" />

          <defs>
            <radialGradient id="eggGradient" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FDF6EC" />
              <stop offset="60%" stopColor="#F0E6D3" />
              <stop offset="100%" stopColor="#DDD0BC" />
            </radialGradient>
            <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E07B4A" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#E07B4A" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Stage badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#FDFAF4] border border-[#E2D9C8] rounded-full px-3 py-0.5 text-xs text-[#7A6E5F] whitespace-nowrap shadow-sm">
          {stage === "egg" && "🥚 descubriéndote"}
          {stage === "cracking" && "🔥 algo se mueve"}
          {stage === "hatching" && "✨ casi listo"}
          {stage === "emerging" && "👁 tomando forma"}
          {stage === "self" && "🌟 sos vos"}
        </div>
      </div>

      {/* Speech bubble */}
      <div className="relative max-w-xs">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0
          border-l-[8px] border-l-transparent
          border-r-[8px] border-r-transparent
          border-b-[10px] border-b-[#E2D9C8]" />
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0
          border-l-[7px] border-l-transparent
          border-r-[7px] border-r-transparent
          border-b-[9px] border-b-[#FDFAF4]" />
        <div className="bg-[#FDFAF4] border border-[#E2D9C8] rounded-2xl px-5 py-3.5 shadow-sm">
          <p className="font-[family-name:var(--font-lora)] italic text-[#2C2416] text-sm leading-relaxed text-center">
            "{displayMessage}"
          </p>
        </div>
      </div>
    </div>
  );
}
