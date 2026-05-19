"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { createEntry, deleteEntry } from "./actions";
import { X, Trash2, Smile } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Entry {
  id: string;
  content: string;
  entry_date: string;
  emoji: string | null;
}

// ─── Emoji palette ────────────────────────────────────────────────────────────

const EMOJIS = [
  "😊", "😢", "😴", "😤", "😰", "🥰",
  "😌", "😔", "😎", "🥺", "🤔", "😮",
  "💪", "❤️", "✨", "🔥", "💡", "🙏",
  "🎉", "🌟", "⚡", "🌈", "🌙", "☀️",
  "🏋️", "📚", "🎵", "🌿", "🌊", "💭",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff < 7) return `hace ${diff}d`;
  if (diff < 30) return `hace ${Math.round(diff / 7)}s`;
  if (diff < 365) return `hace ${Math.round(diff / 30)}m`;
  return `hace ${Math.round(diff / 365)}a`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiaryClient({ entries }: { entries: Entry[] }) {
  const [content,         setContent]         = useState("");
  const [date,            setDate]             = useState(todayStr);
  const [emoji,           setEmoji]            = useState<string | null>(null);
  const [showPicker,      setShowPicker]       = useState(false);
  const [selected,        setSelected]         = useState<Entry | null>(null);
  const [isPending,       startTransition]     = useTransition();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef   = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPicker]);

  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }

  async function handleSave() {
    if (!content.trim()) return;
    const snap = { content: content.trim(), date, emoji };
    setContent("");
    setEmoji(null);
    setDate(todayStr());
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    startTransition(async () => {
      await createEntry(snap.content, snap.date, snap.emoji);
    });
  }

  function handleDelete(id: string) {
    setSelected(null);
    startTransition(async () => {
      await deleteEntry(id);
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-8 py-10">

        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[#0A0A0A]">
            Diario
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mt-1">
            {entries.length} {entries.length === 1 ? "anotación" : "anotaciones"}
          </p>
        </div>

        {/* ── Write area ── */}
        <div className="mb-10 bg-[#F9FAFB] rounded-2xl px-5 pt-5 pb-4 transition-shadow focus-within:shadow-[0_0_0_2px_#9D4EDD22]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => { setContent(e.target.value); autoResize(); }}
            placeholder="¿Qué siento hoy?"
            rows={4}
            className="w-full bg-transparent resize-none text-[#0A0A0A] text-[15px] leading-relaxed placeholder:text-[#D1D5DB] focus:outline-none"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EFEFEF]">
            <div className="flex items-center gap-3">

              {/* Emoji picker trigger */}
              <div className="relative" ref={pickerRef}>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPicker(p => !p)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#EFEFEF] transition-colors"
                    title="Agregar emoji"
                  >
                    {emoji
                      ? <span className="text-base leading-none">{emoji}</span>
                      : <Smile size={14} className="text-[#C9C9C9]" />
                    }
                  </button>
                  {emoji && (
                    <button
                      type="button"
                      onClick={() => setEmoji(null)}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#9CA3AF] hover:bg-[#6B7280] rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={7} className="text-white" />
                    </button>
                  )}
                </div>

                {/* Picker dropdown */}
                {showPicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white border border-[#E5E7EB] rounded-xl p-2.5 shadow-xl z-20 w-52">
                    <div className="grid grid-cols-6 gap-0.5">
                      {EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => { setEmoji(e); setShowPicker(false); }}
                          className={`w-7 h-7 text-base flex items-center justify-center rounded-lg transition-colors ${
                            emoji === e ? "bg-[#F0E8FF]" : "hover:bg-[#F5F5F5]"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] bg-transparent focus:outline-none focus:text-[#0A0A0A] cursor-pointer transition-colors"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!content.trim() || isPending}
              className="px-4 py-1.5 bg-[#0A0A0A] text-white text-[11px] font-medium rounded-lg font-[family-name:var(--font-mono)] disabled:opacity-25 hover:bg-[#374151] transition-colors"
            >
              {isPending ? "guardando…" : "guardar"}
            </button>
          </div>
        </div>

        {/* ── Entries list ── */}
        {entries.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-[family-name:var(--font-mono)] text-sm text-[#D1D5DB]">
              Todavía no escribiste nada.
            </p>
            <p className="font-[family-name:var(--font-mono)] text-xs text-[#E5E7EB] mt-1">
              El primer paso es el más importante.
            </p>
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 pb-2 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-28 shrink-0">
                fecha
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest flex-1">
                anotación
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#D1D5DB] uppercase tracking-widest w-12 text-right shrink-0">
                cuándo
              </span>
            </div>

            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelected(entry)}
                className="w-full flex items-baseline gap-4 px-4 py-3.5 rounded-xl hover:bg-[#F9FAFB] transition-colors text-left group"
              >
                <span className="font-[family-name:var(--font-playfair)] text-sm text-[#0A0A0A] shrink-0 w-28 leading-snug">
                  {formatDate(entry.entry_date)}
                </span>
                <span className="flex-1 font-[family-name:var(--font-mono)] text-[11px] text-[#9CA3AF] truncate leading-relaxed group-hover:text-[#6B7280] transition-colors">
                  {entry.emoji && (
                    <span className="mr-1.5 not-italic">{entry.emoji}</span>
                  )}
                  {entry.content}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#D1D5DB] group-hover:text-[#9CA3AF] shrink-0 w-12 text-right transition-colors whitespace-nowrap">
                  {daysAgo(entry.entry_date)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Full entry modal ── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-lg w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                {selected.emoji && (
                  <span className="text-3xl leading-none">{selected.emoji}</span>
                )}
                <div>
                  <p className="font-[family-name:var(--font-playfair)] font-bold text-[#0A0A0A] text-base">
                    {formatDate(selected.entry_date)}
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#9CA3AF] mt-0.5">
                    {daysAgo(selected.entry_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-1.5 text-[#E5E7EB] hover:text-[#FF1493] hover:bg-[#FFF0F5] rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 text-[#9CA3AF] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="h-px bg-[#F3F4F6] mb-5" />

            <p className="text-[#374151] text-[15px] leading-relaxed whitespace-pre-wrap">
              {selected.content}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
