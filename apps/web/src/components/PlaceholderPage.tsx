interface PlaceholderPageProps {
  title: string;
  phase: string;
}

export function PlaceholderPage({ title, phase }: PlaceholderPageProps) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-slate-500 mt-1">Implemented in {phase}.</p>
    </div>
  );
}
