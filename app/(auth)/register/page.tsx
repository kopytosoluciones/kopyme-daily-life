"use client";

import { useState } from "react";
import { register } from "./actions";
import Link from "next/link";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await register(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#FDFAF4] rounded-2xl border border-[#E2D9C8] shadow-sm p-8">
      <h2 className="font-[family-name:var(--font-lora)] text-2xl font-semibold text-[#2C2416] mb-2">
        Empezá tu historia
      </h2>
      <p className="text-sm text-[#7A6E5F] mb-6">
        Tu huevo te espera.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#7A6E5F] mb-1.5">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9C8] bg-[#F5F0E8] text-[#2C2416] placeholder-[#B8B0A4] focus:outline-none focus:ring-2 focus:ring-[#E07B4A]/40 transition"
          />
        </div>

        <div>
          <label className="block text-sm text-[#7A6E5F] mb-1.5">Contraseña</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="mínimo 6 caracteres"
            className="w-full px-4 py-2.5 rounded-xl border border-[#E2D9C8] bg-[#F5F0E8] text-[#2C2416] placeholder-[#B8B0A4] focus:outline-none focus:ring-2 focus:ring-[#E07B4A]/40 transition"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-[#E07B4A] text-[#FDFAF4] font-medium hover:bg-[#cc6d3e] active:scale-[0.98] transition-all disabled:opacity-60 mt-2"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-[#7A6E5F] mt-6">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-[#E07B4A] hover:underline font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}
