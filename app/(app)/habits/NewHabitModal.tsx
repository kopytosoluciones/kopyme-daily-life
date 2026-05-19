"use client";

import { useState, useTransition } from "react";
import { createHabit } from "./actions";
import { X } from "lucide-react";

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.15)] w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#F5F5F5]">
          <div className="flex justify-between items-center">
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[#0A0A0A]">
              Nuevo hábito
            </h3>
            <button onClick={onClose} className="text-[#D1D5DB] hover:text-[#0A0A0A] transition-colors">
              <X size={16} />
            </button>
          </div>
          {/* Steps */}
          <div className="flex gap-1.5 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  s <= step ? "bg-[#9D4EDD]" : "bg-[#E5E7EB]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* Step 1: Name */}
          {step === 1 && (
            <div>
              <label className="block text-sm text-[#6B7280] mb-2">¿Cómo se llama el hábito?</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(2); }}
                placeholder="ej: Horas dormidas, Gym, Meditar..."
                className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all"
              />
            </div>
          )}

          {/* Step 2: Type */}
          {step === 2 && (
            <div>
              <label className="block text-sm text-[#6B7280] mb-3">¿Cómo vas a medirlo?</label>
              <div className="space-y-2">
                {([
                  { type: "boolean",  label: "Sí / No",  desc: "Lo hiciste o no" },
                  { type: "numeric",  label: "Número",   desc: "Una cantidad (hs, km, vasos...)" },
                  { type: "dropdown", label: "Opciones", desc: "Elegís entre opciones que vos definís" },
                ] as { type: GoalType; label: string; desc: string }[]).map(({ type, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => setGoalType(type)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      goalType === type
                        ? "border-[#9D4EDD] bg-[#9D4EDD]/5"
                        : "border-[#E5E7EB] hover:border-[#9D4EDD]/40"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-[#0A0A0A]">{label}</p>
                      <p className="text-xs text-[#9CA3AF]">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Configure boolean */}
          {step === 3 && goalType === "boolean" && (
            <div className="text-center py-4">
              <p className="text-sm text-[#6B7280]">
                <span className="font-medium text-[#0A0A0A]">{name}</span> — vas a marcar si lo hiciste cada día.
              </p>
            </div>
          )}

          {/* Step 3: Configure numeric */}
          {step === 3 && goalType === "numeric" && (
            <div className="space-y-3">
              <p className="text-sm text-[#6B7280] mb-1">Configurá el número</p>
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">Unidad</label>
                <input
                  autoFocus
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="ej: hs, km, vasos"
                  className="w-full px-3 py-2 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9CA3AF] mb-1">Objetivo (opcional)</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="ej: 8"
                  className="w-full px-3 py-2 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all"
                />
              </div>
            </div>
          )}

          {/* Step 3: Configure dropdown */}
          {step === 3 && goalType === "dropdown" && (
            <div>
              <p className="text-sm text-[#6B7280] mb-3">Definí las opciones</p>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={e => setOption(i, e.target.value)}
                      placeholder={`Opción ${i + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] text-sm transition-all"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="text-[#D1D5DB] hover:text-[#FF1493] transition-colors px-2"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addOption} className="mt-2 text-xs text-[#9D4EDD] hover:underline">
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
              className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-sm text-[#6B7280] hover:bg-[#F5F5F5] transition-all"
            >
              Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              className="flex-1 py-2.5 rounded-lg bg-[#0A0A0A] text-white text-sm font-medium border-2 border-[#0A0A0A] hover:bg-[#1f1f1f] transition-all disabled:opacity-40"
            >
              Siguiente
            </button>
          ) : (
            <button
              disabled={pending || (goalType === "dropdown" && options.filter(o => o.trim()).length < 2)}
              onClick={handleCreate}
              className="flex-1 py-2.5 rounded-lg bg-[#0A0A0A] text-white text-sm font-medium border-2 border-[#0A0A0A] hover:bg-[#1f1f1f] transition-all disabled:opacity-40"
            >
              {pending ? "Creando..." : "Crear hábito"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
