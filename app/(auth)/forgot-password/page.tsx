"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[#0A0A0A] mb-2">
          Revisá tu mail
        </h2>
        <p className="font-[family-name:var(--font-mono)] text-sm text-[#6B7280] mb-6">
          Te mandamos un link a <span className="text-[#0A0A0A] font-medium">{email}</span>.
          Puede tardar un par de minutos.
        </p>
        <Link
          href="/login"
          className="font-[family-name:var(--font-mono)] text-xs text-[#9D4EDD] hover:underline"
        >
          ← volver al login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-8">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] mb-2">
        Recuperar contraseña
      </h2>
      <p className="font-[family-name:var(--font-mono)] text-xs text-[#9CA3AF] mb-6">
        Ingresá tu email y te mandamos un link para resetearla.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-[#6B7280] mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
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
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6B7280] mt-6">
        <Link href="/login" className="text-[#9D4EDD] hover:underline font-medium">
          ← volver al login
        </Link>
      </p>
    </div>
  );
}
