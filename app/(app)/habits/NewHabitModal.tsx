"use client";

import { useEffect, useState, useTransition } from "react";
import { createHabit } from "./actions";

type GoalType = "boolean" | "numeric" | "dropdown";

interface Props {
  onClose: () => void;
}

export default function NewHabitModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const label = "font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase";
  const input = "w-full border-2 border-foreground bg-card px-3 py-2 font-mono text-sm outline-none placeholder:text-muted-foreground focus:bg-primary/10";
  const primaryBtn = "flex-1 border-2 border-foreground bg-primary px-3 py-2 font-mono text-xs tracking-[0.06em] text-primary-foreground uppercase shadow-hard-primary transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-label="Nuevo hábito" className="w-full max-w-sm border-2 border-foreground bg-card shadow-hard-lg">

        <div className="border-b-2 border-foreground px-4 py-2.5">
          <div className="flex items-center justify-between">
            <h3 className={label}>── Nuevo hábito</h3>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground tabular">[{step}/3]</span>
              <button type="button" onClick={onClose} aria-label="Cerrar" className="font-mono text-xs text-muted-foreground hover:text-foreground">✕</button>
            </div>
          </div>
          <div aria-hidden className="mt-2.5 flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 ${s <= step ? "bg-foreground" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="p-4">

          {step === 1 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="habit-name" className={label}>¿Cómo se llama?</label>
              <input
                id="habit-name"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && name.trim()) setStep(2); }}
                placeholder="ej: Horas dormidas, Gym, Meditar…"
                className={input}
              />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              <span className={label}>¿Cómo vas a medirlo?</span>
              <div role="radiogroup" aria-label="Tipo de medición" className="flex flex-col border-2 border-foreground">
                {([
                  { type: "boolean",  label: "Sí / No",  desc: "Lo hiciste o no" },
                  { type: "numeric",  label: "Número",   desc: "Una cantidad (hs, km, vasos…)" },
                  { type: "dropdown", label: "Opciones", desc: "Elegís entre opciones que vos definís" },
                ] as { type: GoalType; label: string; desc: string }[]).map(({ type, label: optLabel, desc }) => {
                  const on = goalType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setGoalType(type)}
                      className={`flex items-start gap-2.5 border-b border-muted px-3 py-2.5 text-left last:border-b-0 ${on ? "bg-muted" : "hover:bg-muted/50"}`}
                    >
                      <span aria-hidden className={`font-mono text-xs leading-5 ${on ? "text-primary" : "text-muted-foreground"}`}>{on ? "●" : "○"}</span>
                      <span>
                        <span className="block text-sm font-bold">{optLabel}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && goalType === "boolean" && (
            <p className="py-3 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{name}</span> — vas a marcar si lo hiciste cada día.
            </p>
          )}

          {step === 3 && goalType === "numeric" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="habit-unit" className={label}>Unidad</label>
                <input
                  id="habit-unit"
                  autoFocus
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="ej: hs, km, vasos"
                  className={input}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="habit-target" className={label}>Objetivo (opcional)</label>
                <input
                  id="habit-target"
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  placeholder="ej: 8"
                  className={`${input} tabular`}
                />
              </div>
            </div>
          )}

          {step === 3 && goalType === "dropdown" && (
            <div className="flex flex-col gap-2">
              <span className={label}>Definí las opciones</span>
              <div className="flex flex-col gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={e => setOption(i, e.target.value)}
                      placeholder={`Opción ${i + 1}`}
                      aria-label={`Opción ${i + 1}`}
                      className={`${input} flex-1`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        aria-label={`Quitar opción ${i + 1}`}
                        className="px-2 font-mono text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="w-fit font-mono text-[11px] tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
              >
                + agregar opción
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="border-2 border-foreground bg-card px-3 py-2 font-mono text-xs tracking-[0.06em] uppercase shadow-hard transition-transform duration-100 hover:-translate-x-px hover:-translate-y-px active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              ← Atrás
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              className={primaryBtn}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              disabled={pending || (goalType === "dropdown" && options.filter(o => o.trim()).length < 2)}
              onClick={handleCreate}
              className={primaryBtn}
            >
              {pending ? "Creando…" : "Crear hábito"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
