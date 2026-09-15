export function Stat({
  label,
  value,
  valueDir,
}: {
  label: string;
  value: string;
  valueDir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-start text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-start text-sm font-bold leading-6" dir={valueDir}>
        {value}
      </p>
    </div>
  );
}
