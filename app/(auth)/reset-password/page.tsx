"use client";

import { useState } from "react";
import { updatePassword } from "./actions";

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // on success, updatePassword redirects to /dashboard
  }

  return (
    <div className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-8">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] mb-2">
        Nueva contraseña
      </h2>
      <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mb-6">
        Elegí una contraseña nueva para tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-[#6B7280] mb-1.5">Nueva contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs text-[#6B7280] mb-1.5">Confirmar contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] transition-all"
          />
        </div>

        {error && (
          <p className="text-sm text-[#FF1493] bg-[#FF1493]/5 border border-[#FF1493]/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-[#0A0A0A] text-white font-medium border-2 border-[#0A0A0A] hover:bg-[#1f1f1f] active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
        >
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
