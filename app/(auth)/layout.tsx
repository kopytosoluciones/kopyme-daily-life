export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[#0A0A0A] tracking-tight">
            kopyme
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[#9CA3AF] mt-1 text-xs">
            tu vida, documentada.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
