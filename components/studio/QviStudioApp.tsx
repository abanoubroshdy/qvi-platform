"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { interpolate } from "@/lib/i18n";
import { qviStudioLimits, studioImportExtensions } from "@/lib/studio/definition";
import { StudioExportDialog } from "@/components/studio/StudioExportDialog";
import { useStudioMeterPaint } from "@/components/studio/StudioLevelMeter";
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
  const rootRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);
  const [dropping, setDropping] = useState(false);
  useStudioMeterPaint(rootRef);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (session.exportOpen) {
        session.setExportOpen(false);
        return;
      }
      if (session.inspectorOpen || session.mixerOpen) {
        session.setInspectorOpen(false);
        session.setMixerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session]);

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
      ref={rootRef}
      data-studio-console
      data-dropping={dropping ? "true" : "false"}
      dir="ltr"
      className="studio-console flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden"
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDropping(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDropping(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDropping(false);
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
        <div className="z-30 shrink-0 border-b border-border">
          <StudioTransport copy={studioCopy} />
          {notice && (
            <p className="flex items-start justify-between gap-3 px-4 pb-3 text-sm text-muted-foreground" role="status">
              <span>
                {notice}
                {session.importing ? ` ${studioCopy.reading}` : ""}
              </span>
              <button type="button" className="shrink-0 font-medium text-foreground" onClick={session.clearNotice}>
                {studioCopy.close}
              </button>
            </p>
          )}
          {session.importing && !notice && (
            <p className="px-4 pb-3 text-sm text-muted-foreground" role="status">
              {studioCopy.reading}
            </p>
          )}
          {session.restoring && (
            <p className="px-4 pb-3 text-sm text-muted-foreground" role="status">
              {studioCopy.restoring}
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <StudioTimeline copy={studioCopy} />
          </div>
          {session.viewport === "desktop" && session.inspectorOpen && (
            <aside className="studio-inspector hidden w-72 shrink-0 overflow-y-auto border-s border-border lg:flex lg:flex-col" aria-label={studioCopy.inspector}>
              <StudioTrackInspector copy={studioCopy} />
            </aside>
          )}
          <aside className="studio-mixer hidden w-72 shrink-0 overflow-y-auto border-s border-border lg:block">
            <StudioMixer copy={studioCopy} />
          </aside>
        </div>

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
    <div className={`fixed inset-x-0 bottom-0 top-16 z-40 flex ${side === "bottom" ? "items-end" : "justify-end"}`}>
      <button type="button" className="absolute inset-0 bg-black/40" aria-label={label} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
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

function noticeKey(
  code: NonNullable<StudioSession["notice"]>,
): "largeFile" | "unsupported" | "decodeFailed" | "previewFailed" | "trackCap" | "saveFailed" | "restoreFailed" {
  if (code === "large-file") return "largeFile";
  if (code === "unsupported-file") return "unsupported";
  if (code === "decode-failed") return "decodeFailed";
  if (code === "preview-failed") return "previewFailed";
  if (code === "save-failed") return "saveFailed";
  if (code === "restore-failed") return "restoreFailed";
  return "trackCap";
}
