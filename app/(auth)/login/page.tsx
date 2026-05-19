"use client";

import { useState } from "react";
import { login } from "./actions";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-[#0A0A0A] shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-8">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[#0A0A0A] mb-6">
        Bienvenido de vuelta
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-[#6B7280] mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            className="w-full px-4 py-2.5 rounded-lg border border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A] placeholder-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] focus:border-[#9D4EDD] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs text-[#6B7280] mb-1.5">Contraseña</label>
          <input
            name="password"
            type="password"
            required
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
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6B7280] mt-6">
        ¿Primera vez?{" "}
        <Link href="/register" className="text-[#9D4EDD] hover:underline font-medium">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
