interface PlaceholderViewProps {
  title: string;
  description: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <section className="view">
      <header className="view__header">
        <h1 className="view__title">{title}</h1>
      </header>
      <div className="view__body">
        <p className="view__placeholder">{description}</p>
      </div>
    </section>
  );
}
