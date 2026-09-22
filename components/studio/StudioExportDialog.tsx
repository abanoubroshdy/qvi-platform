"use client";

import { Button } from "@/components/ui/button";
import { studioExportFormats } from "@/lib/studio/definition";
import type { Messages } from "@/lib/i18n";

export function StudioExportDialog({
  copy,
  onClose,
}: {
  copy: Messages["studio"];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label={copy.close} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="studio-export-title" className="relative m-4 w-full max-w-md rounded-2xl border bg-background p-5 shadow-xl">
        <h2 id="studio-export-title" className="text-lg font-semibold">
          {copy.export}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.exportPending}</p>
        <p dir="ltr" className="mt-3 text-sm font-medium">
          {studioExportFormats.map((format) => format.toUpperCase()).join(" · ")}
        </p>
        <Button type="button" className="mt-4" onClick={onClose}>
          {copy.close}
        </Button>
      </div>
    </div>
  );
}
