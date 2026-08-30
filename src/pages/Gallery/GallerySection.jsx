// Gallery scaffolding only. Nothing here is used by a feature screen.
export function Section({ id, title, note, children }) {
  return (
    <section id={id} className="scroll-mt-20">
      <header className="mb-4 border-b border-lightGray-dark pb-2">
        <h2 className="font-display text-xl">{title}</h2>
        {note ? <p className="mt-1 text-sm text-charcoal-light">{note}</p> : null}
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function Row({ label, children }) {
  return (
    <div className="rounded-md border border-lightGray-dark bg-white p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-wide text-charcoal-lighter">{label}</p>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}

export function Stack({ label, children }) {
  return (
    <div className="rounded-md border border-lightGray-dark bg-white p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-wide text-charcoal-lighter">{label}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
