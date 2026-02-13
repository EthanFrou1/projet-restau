type Props = {
  totalCa: number;
  totalN1: number;
  totalPrev: number;
  moneyFmt: Intl.NumberFormat;
  pctFmt: Intl.NumberFormat;
};

export function DirectionSummary({ totalCa, totalN1, totalPrev, moneyFmt, pctFmt }: Props) {
  const pctN1 = totalN1 === 0 ? null : (totalCa - totalN1) / totalN1;
  const ecartPrev = totalCa - totalPrev;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">CA Total Groupe</div>
        <div className="mt-2 text-3xl font-bold text-foreground">{moneyFmt.format(totalCa)}</div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">% N-1</div>
        <div className="mt-2 text-3xl font-bold text-foreground">
          {pctN1 === null ? "—" : pctFmt.format(pctN1)}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Écart vs prév</div>
        <div className="mt-2 text-3xl font-bold text-foreground">{moneyFmt.format(ecartPrev)}</div>
      </div>
    </div>
  );
}
