"use client";

import { useState, useTransition } from "react";
import { createHabit } from "./actions";

type GoalType = "boolean" | "numeric" | "dropdown";

interface Props {
  onClose: () => void;
}

export default function NewHabitModal({ onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("boolean");
  const [unit, setUnit] = useState("");
  const [target, setTarget] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [pending, startTransition] = useTransition();

  function addOption() { setOptions([...options, ""]); }
  function removeOption(i: number) { setOptions(options.filter((_, idx) => idx !== i)); }
  function setOption(i: number, val: string) {
    const next = [...options]; next[i] = val; setOptions(next);
  }

  function handleCreate() {
    const cleanOptions = options.map(o => o.trim()).filter(Boolean);
    startTransition(async () => {
      await createHabit({
        name: name.trim(),
        goal_type: goalType,
        goal_unit: unit.trim() || undefined,
        goal_target: target.trim() || undefined,
        goal_options: cleanOptions,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#FDFAF4] rounded-2xl border border-[#E2D9C8] shadow-lg w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#F0EBE2]">
          <div className="flex justify-between items-center">
            <h3 className="font-[family-name:var(--font-lora)] text-lg font-semibold text-[#2C2416]">
              Nuevo hábito
            </h3>
            <button onClick={onClose} className="text-[#C8BFB0] hover:text-[#7A6E5F] transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {/* Steps */}
          <div className="flex gap-1.5 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? "bg-[#E07B4A]" : "bg-[#E2D9C8]"}`} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* Step 1: Name */}
          {step === 1 && (
            <div>
              <label className="block text-sm text-[#7A6E5F] mb-2">¿Cómo se llama el hábito?</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(2); }}
                placeholder="ej: Horas dormidas, Gym, Meditar..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9C8] bg-[#F5F0E8] text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none focus:ring-2 focus:ring-[#E07B4A]/30 text-sm"
              />
            </div>
          )}

          {/* Step 2: Type */}
          {step === 2 && (
            <div>
              <label className="block text-sm text-[#7A6E5F] mb-3">¿Cómo vas a medirlo?</label>
              <div className="space-y-2">
                {([
                  { type: "boolean",  icon: "✓", label: "Sí / No",       desc: "Lo hiciste o no" },
                  { type: "numeric",  icon: "🔢", label: "Número",        desc: "Una cantidad (hs, km, vasos...)" },
                  { type: "dropdown", icon: "📋", label: "Opciones",      desc: "Elegís entre opciones que vos definís" },
                ] as { type: GoalType; icon: string; label: string; desc: string }[]).map(({ type, icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setGoalType(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      goalType === type
                        ? "border-[#E07B4A] bg-[#E07B4A]/5"
                        : "border-[#E2D9C8] hover:border-[#E07B4A]/40"
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="text-sm font-medium text-[#2C2416]">{label}</p>
                      <p className="text-xs text-[#B8B0A4]">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Configure */}
          {step === 3 && goalType === "boolean" && (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">✓</p>
              <p className="text-sm text-[#7A6E5F]">
                <span className="font-medium text-[#2C2416]">{name}</span> — vas a marcar si lo hiciste cada día.
              </p>
            </div>
          )}

          {step === 3 && goalType === "numeric" && (
            <div className="space-y-3">
              <p className="text-sm text-[#7A6E5F] mb-1">Configurá el número</p>
              <div>
                <label className="block text-xs text-[#B8B0A4] mb-1">Unidad</label>
                <input
                  autoFocus
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="ej: hs, km, vasos"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2D9C8] bg-[#F5F0E8] text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none focus:ring-2 focus:ring-[#E07B4A]/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8B0A4] mb-1">Objetivo (opcional)</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="ej: 8"
                  className="w-full px-3 py-2 rounded-xl border border-[#E2D9C8] bg-[#F5F0E8] text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none focus:ring-2 focus:ring-[#E07B4A]/30 text-sm"
                />
              </div>
            </div>
          )}

          {step === 3 && goalType === "dropdown" && (
            <div>
              <p className="text-sm text-[#7A6E5F] mb-3">Definí las opciones</p>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={e => setOption(i, e.target.value)}
                      placeholder={`Opción ${i + 1}`}
                      className="flex-1 px-3 py-2 rounded-xl border border-[#E2D9C8] bg-[#F5F0E8] text-[#2C2416] placeholder-[#C8BFB0] focus:outline-none focus:ring-2 focus:ring-[#E07B4A]/30 text-sm"
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="text-[#C8BFB0] hover:text-red-400 transition-colors px-2">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addOption} className="mt-2 text-xs text-[#E07B4A] hover:underline">
                + agregar opción
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="flex-1 py-2.5 rounded-xl border border-[#E2D9C8] text-sm text-[#7A6E5F] hover:bg-[#F5F0E8] transition-all"
            >
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              className="flex-1 py-2.5 rounded-xl bg-[#E07B4A] text-white text-sm font-medium hover:bg-[#cc6d3e] transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          ) : (
            <button
              disabled={pending || (goalType === "dropdown" && options.filter(o => o.trim()).length < 2)}
              onClick={handleCreate}
              className="flex-1 py-2.5 rounded-xl bg-[#E07B4A] text-white text-sm font-medium hover:bg-[#cc6d3e] transition-all disabled:opacity-40"
            >
              {pending ? "Creando..." : "Crear hábito"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
