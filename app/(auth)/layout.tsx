export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-lora)] text-4xl font-bold text-[#2C2416] tracking-tight">
            kopyme
          </h1>
          <p className="text-[#7A6E5F] mt-1 text-sm">tu vida, documentada.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
