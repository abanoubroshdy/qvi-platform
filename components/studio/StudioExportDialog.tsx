"use client";

import { useMemo, useState } from "react";
import { AudioExportSettingsPanel } from "@/components/tools/AudioExportSettings";
import { useStudio } from "@/components/studio/studio-context";
import { Button } from "@/components/ui/button";
import { stretchAudioBufferOffThread } from "@/lib/audio-stretch-task";
import { defaultAudioExportSettings, type AudioExportSettings } from "@/lib/audio-export";
import { downloadBlob } from "@/lib/download";
import type { Messages } from "@/lib/i18n";
import { createStudioExportEngine } from "@/lib/studio/export-engine";
import { projectExportBlockReason } from "@/lib/studio/project";
import { studioExportFormats, type StudioExportFormat } from "@/lib/studio/definition";

export function StudioExportDialog({
  copy,
  onClose,
}: {
  copy: Messages["studio"];
  onClose: () => void;
}) {
  const studio = useStudio();
  const [format, setFormat] = useState<StudioExportFormat>("mp3");
  const [settings, setSettings] = useState<AudioExportSettings>(defaultAudioExportSettings);
  const [exporting, setExporting] = useState(false);
  const [failed, setFailed] = useState(false);
  const engine = useMemo(
    () => createStudioExportEngine({ stretchClip: (buffer, options) => stretchAudioBufferOffThread(buffer, options) }),
    [],
  );
  const block = projectExportBlockReason(studio.project);
  const blockCopy = block === "empty-project" ? copy.exportEmpty : block === "nothing-audible" ? copy.exportSilent : null;

  async function onExport() {
    if (block || exporting) return;
    setFailed(false);
    setExporting(true);
    try {
      const result = await engine.exportMix({ project: studio.project, format, settings });
      if (!result.ok) return;
      downloadBlob(result.blob, result.fileName);
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label={copy.close} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-export-title"
        className="relative m-4 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl"
      >
        <h2 id="studio-export-title" className="text-lg font-semibold">
          {copy.export}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.exportLead}</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">{copy.format}</p>
          <div className="flex flex-wrap gap-2" dir="ltr">
            {studioExportFormats.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={format === item ? "default" : "outline"}
                aria-pressed={format === item}
                disabled={exporting}
                onClick={() => setFormat(item)}
              >
                {item.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <AudioExportSettingsPanel format={format} settings={settings} disabled={exporting} onChange={setSettings} />
        </div>
        {blockCopy && (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {blockCopy}
          </p>
        )}
        {failed && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {copy.exportFailed}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" disabled={Boolean(block) || exporting} onClick={() => void onExport()}>
            {exporting ? copy.exporting : copy.exportAction}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={exporting}>
            {copy.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
