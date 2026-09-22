"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { interpolate } from "@/lib/i18n";
import { qviStudioLimits, studioImportExtensions } from "@/lib/studio/definition";
import { StudioExportDialog } from "@/components/studio/StudioExportDialog";
import { StudioMixer } from "@/components/studio/StudioMixer";
import { StudioTimeline } from "@/components/studio/StudioTimeline";
import { StudioTrackInspector } from "@/components/studio/StudioTrackInspector";
import { StudioTransport } from "@/components/studio/StudioTransport";
import { useStudio } from "@/components/studio/studio-context";
import type { StudioSession } from "@/components/studio/useStudioSession";

export function QviStudioApp() {
  const session = useStudio();
  const { copy } = useI18n();
  const studioCopy = copy.studio;
  const accept = [...studioImportExtensions.map((ext) => `.${ext}`), "audio/*"].join(",");

  const notice =
    session.notice === "track-cap-reached" || session.notice === "track-limit"
      ? interpolate(session.notice === "track-limit" ? studioCopy.trackLimit : studioCopy.trackCap, {
          count: qviStudioLimits.tracks[session.viewport].maxTracks,
        })
      : session.notice
        ? studioCopy[noticeKey(session.notice)]
        : null;

  return (
    <div
      className="bg-background"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void session.importFiles(Array.from(event.dataTransfer.files));
      }}
    >
        <input
          ref={session.fileInputRef}
          className="sr-only"
          type="file"
          accept={accept}
          multiple
          aria-label={studioCopy.addFiles}
          onChange={(event) => session.onFileInput(event.target.files)}
        />
        <div className="sticky top-16 z-50 border-b border-border bg-background/95 backdrop-blur">
          <StudioTransport copy={studioCopy} />
          {notice && (
            <p className="px-4 pb-3 text-sm text-muted-foreground" role="status">
              {notice}
              {session.importing ? ` ${studioCopy.reading}` : ""}
            </p>
          )}
          {session.importing && !notice && (
            <p className="px-4 pb-3 text-sm text-muted-foreground" role="status">
              {studioCopy.reading}
            </p>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
          <div className="min-w-0 flex-1">
            <StudioTimeline copy={studioCopy} />
          </div>
          <aside className="hidden w-80 shrink-0 border-s border-border lg:block">
            <StudioMixer copy={studioCopy} />
          </aside>
        </div>

        {session.viewport === "desktop" && session.inspectorOpen && (
          <div className="border-t border-border">
            <StudioTrackInspector copy={studioCopy} />
          </div>
        )}

        {session.viewport === "tablet" && session.mixerOpen && (
          <Sheet label={studioCopy.close} onClose={() => session.setMixerOpen(false)} side="bottom">
            <StudioMixer copy={studioCopy} />
          </Sheet>
        )}
        {session.viewport === "tablet" && session.inspectorOpen && (
          <Sheet label={studioCopy.close} onClose={() => session.setInspectorOpen(false)} side="end">
            <StudioTrackInspector copy={studioCopy} />
          </Sheet>
        )}
        {session.viewport === "mobile" && (session.inspectorOpen || session.mixerOpen) && (
          <Sheet
            label={studioCopy.close}
            onClose={() => {
              session.setInspectorOpen(false);
              session.setMixerOpen(false);
            }}
            side="bottom"
          >
            <StudioTrackInspector copy={studioCopy} />
            <StudioMixer copy={studioCopy} />
          </Sheet>
        )}
        {session.exportOpen && <StudioExportDialog copy={studioCopy} onClose={() => session.setExportOpen(false)} />}
    </div>
  );
}

function Sheet({
  children,
  label,
  onClose,
  side,
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
  side: "bottom" | "end";
}) {
  return (
    <div className={`fixed inset-0 z-40 flex ${side === "bottom" ? "items-end" : "justify-end"}`}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label={label} onClick={onClose} />
      <div
        className={
          side === "bottom"
            ? "relative max-h-[75dvh] w-full overflow-y-auto rounded-t-2xl border bg-background shadow-xl"
            : "relative h-full w-[min(100%,22rem)] overflow-y-auto border bg-background shadow-xl"
        }
      >
        {children}
      </div>
    </div>
  );
}

function noticeKey(code: NonNullable<StudioSession["notice"]>): "largeFile" | "unsupported" | "decodeFailed" | "previewFailed" | "trackCap" {
  if (code === "large-file") return "largeFile";
  if (code === "unsupported-file") return "unsupported";
  if (code === "decode-failed") return "decodeFailed";
  if (code === "preview-failed") return "previewFailed";
  return "trackCap";
}
