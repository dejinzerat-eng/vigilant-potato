import { LogoMark } from './logo';
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-x flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-[420px]">
        <LogoMark className="mx-auto size-11" />
        <h1 className="h-display mt-5 text-center text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-muted">{subtitle}</p>}
        <div className="card mt-8 p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
