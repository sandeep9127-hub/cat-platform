/**
 * A count set as a small raised annotation beside its label ("Seed systems
 * 42" with the 42 lifted and quieter), instead of a separate column or a
 * second bold line. Pattern from the Refero reference review (co2.is).
 * `srLabel` gives screen readers the noun, e.g. "12 interventions".
 */
export function RaisedCount({ n, srLabel }: { n: number; srLabel?: string }) {
  return (
    <span className="raised-count">
      <span aria-hidden={srLabel ? true : undefined}>{n.toLocaleString("en-IN")}</span>
      {srLabel && <span className="sr-only">{srLabel}</span>}
    </span>
  );
}
