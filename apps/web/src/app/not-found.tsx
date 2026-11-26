import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <div className="h-display text-7xl font-bold text-brand">404</div>
      <h1 className="mt-3 text-2xl font-bold">Tahle stránka tu není</h1>
      <p className="mt-2 text-muted">Inzerát mohl být prodán nebo smazán.</p>
      <Link href="/" className="btn btn-primary mt-6">Zpět na úvod</Link>
    </div>
  );
}
