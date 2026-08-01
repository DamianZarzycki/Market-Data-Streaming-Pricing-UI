interface PlaceholderViewProps {
  title: string;
  description: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>
      <div>
        <p className="max-w-[60ch] text-text-muted">{description}</p>
      </div>
    </section>
  );
}
