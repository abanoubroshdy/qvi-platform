"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stretchAudioBufferOffThread } from "@/lib/audio-stretch-task";
import { createBrowserTempoPitchPreview, connectTempoPreview } from "@/lib/studio/tempo-preview";
import { loadStudioFile } from "@/lib/studio/load-clip";
import { studioPeakBarCount } from "@/lib/studio/peaks";
import { waitForNextPaint } from "@/lib/studio/paint";
import {
  createStudioAudioHost,
  createStudioPlaybackEngine,
  type QviStudioPlaybackEngine,
  type StudioTransportSnapshot,
} from "@/lib/studio/playback-engine";
import {
  addImportedFileAsTrack,
  largeFileWarning,
  addImportedFileToTrack,
  canPlayStudioProject,
  createStudioProject,
  projectDuration,
  removeClip,
  removeTrack,
  seekPlayhead,
  setClipOffset,
  setClipTrim,
  setMasterGain,
  setTrackGain,
  setTrackMuted,
  setTrackName,
  setTrackPitch,
  setTrackSolo,
  setTrackStretchPreset,
  setTrackTempo,
  stopPlayhead,
  trackTempoPitchIsIdentity,
} from "@/lib/studio/project";
import type { StretchPresetId } from "@/lib/audio-stretch-preset";
import { exceedsTrackWarning, type StudioTempoSetting } from "@/lib/studio/definition";
import type { StudioProject, StudioTrack } from "@/lib/studio/types";
import { viewportFromWidth } from "@/lib/studio/timeline-geometry";

export type StudioNoticeCode =
  | "large-file"
  | "track-cap-reached"
  | "track-limit"
  | "unsupported-file"
  | "decode-failed"
  | "preview-failed";

function previewKey(project: StudioProject): string {
  return project.tracks
    .map((track) =>
      [
        track.id,
        track.tempo.mode,
        track.tempo.originalBpm,
        track.tempo.targetBpm,
        track.tempo.percent,
        track.pitchSemitones,
        track.pitchCents,
        track.stretchPreset,
        track.clips
          .map((clip) => [clip.id, clip.offsetSec, clip.trimStartSec, clip.trimEndSec, clip.sourceDurationSec].join(":"))
          .join(","),
      ].join("|"),
    )
    .join("||");
}

export function useStudioSession() {
  const [project, setProject] = useState<StudioProject>(() => createStudioProject("QVI Studio"));
  const projectRef = useRef(project);
  projectRef.current = project;
  const [transport, setTransport] = useState<StudioTransportSnapshot>({ status: "idle", playheadSec: 0 });
  const [viewport, setViewport] = useState(() => viewportFromWidth(1024));
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(48);
  const [notice, setNotice] = useState<StudioNoticeCode | null>(null);
  const [renderingIds, setRenderingIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const engineRef = useRef<QviStudioPlaybackEngine | null>(null);
  const schedulerRef = useRef<ReturnType<typeof connectTempoPreview> | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addTargetRef = useRef<string | null>(null);
  const engineWaitersRef = useRef<Array<() => void>>([]);
  const playheadListenersRef = useRef(new Set<(seconds: number) => void>());
  const playheadRef = useRef(0);

  const commit = useCallback((next: StudioProject, sync = true) => {
    projectRef.current = next;
    setProject(next);
    if (sync) engineRef.current?.sync(next);
  }, []);

  useEffect(() => {
    const context = new AudioContext();
    contextRef.current = context;
    const engine = createStudioPlaybackEngine({
      host: createStudioAudioHost(context),
      onTransport: (snapshot) => {
        playheadRef.current = snapshot.playheadSec;
        setTransport(snapshot);
      },
    });
    engineRef.current = engine;
    const scheduler = connectTempoPreview({
      preview: createBrowserTempoPitchPreview({
        createBuffer: (channels, length, sampleRate) => context.createBuffer(channels, length, sampleRate),
        stretchClip: (buffer, options) =>
          stretchAudioBufferOffThread(buffer, {
            ...options,
            createBuffer: (channels, length, sampleRate) => context.createBuffer(channels, length, sampleRate),
          }),
      }),
      setRenderedTrack: (trackId, buffer) => {
        engine.setRenderedTrack(trackId, buffer);
        setRenderingIds((ids) => ids.filter((id) => id !== trackId));
      },
      onError: (trackId) => {
        setRenderingIds((ids) => ids.filter((id) => id !== trackId));
        setNotice("preview-failed");
      },
    });
    schedulerRef.current = scheduler;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !contextRef.current || !engineRef.current) return;
      const waiters = engineWaitersRef.current.splice(0);
      for (const resolve of waiters) resolve();
    });
    return () => {
      cancelled = true;
      scheduler.dispose();
      schedulerRef.current = null;
      engine.dispose();
      engineRef.current = null;
      contextRef.current = null;
    };
  }, []);

  const whenEngineReady = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (contextRef.current && engineRef.current) {
          resolve();
          return;
        }
        engineWaitersRef.current.push(resolve);
      }),
    [],
  );

  const contentKey = previewKey(project);
  useEffect(() => {
    const scheduler = schedulerRef.current;
    const engine = engineRef.current;
    if (!scheduler || !engine) return;
    const pending: string[] = [];
    for (const track of projectRef.current.tracks) {
      if (!trackTempoPitchIsIdentity(track)) {
        engine.setRenderedTrack(track.id, null);
        pending.push(track.id);
      }
      scheduler.schedule(track);
    }
    setRenderingIds(pending);
  }, [contentKey]);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 639px)");
    const tablet = window.matchMedia("(max-width: 1023px)");
    const update = () => setViewport(viewportFromWidth(window.innerWidth));
    update();
    mobile.addEventListener("change", update);
    tablet.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      tablet.removeEventListener("change", update);
    };
  }, []);

  const displayedPlayhead = transport.status === "playing" ? transport.playheadSec : project.playheadSec;

  const togglePlay = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.resumeFromUserGesture();
    if (engine.currentStatus() === "playing") {
      engine.pause();
      const next = seekPlayhead(projectRef.current, engine.currentPlayhead());
      commit(next, false);
      setTransport({ status: "paused", playheadSec: next.playheadSec });
      return;
    }
    const current = projectRef.current;
    if (!canPlayStudioProject(current)) return;
    engine.play(current);
  }, [commit]);

  const toggleRef = useRef(togglePlay);
  toggleRef.current = togglePlay;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || target?.isContentEditable) return;
      event.preventDefault();
      void toggleRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const publishPlayhead = useCallback((seconds: number) => {
    playheadRef.current = seconds;
    playheadListenersRef.current.forEach((listener) => listener(seconds));
  }, []);

  const subscribePlayhead = useCallback((listener: (seconds: number) => void) => {
    playheadListenersRef.current.add(listener);
    return () => {
      playheadListenersRef.current.delete(listener);
    };
  }, []);

  const playheadNow = useCallback(() => playheadRef.current, []);

  useEffect(() => {
    if (transport.status !== "playing") return;
    let frame = 0;
    const tick = () => {
      const engine = engineRef.current;
      if (!engine || engine.currentStatus() !== "playing") return;
      const snap = engine.poll();
      publishPlayhead(snap.playheadSec);
      if (snap.status !== "playing") {
        const next = seekPlayhead(projectRef.current, snap.playheadSec);
        projectRef.current = next;
        setProject(next);
        setTransport(snap);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [publishPlayhead, transport.status]);

  const seek = useCallback(
    (seconds: number) => {
      const next = seekPlayhead(projectRef.current, seconds);
      commit(next, false);
      engineRef.current?.seek(next.playheadSec);
      if (engineRef.current?.currentStatus() !== "playing") {
        setTransport((current) => ({ ...current, playheadSec: next.playheadSec }));
      }
    },
    [commit],
  );

  const stop = useCallback(() => {
    engineRef.current?.stop();
    const next = stopPlayhead(projectRef.current);
    commit(next, false);
    setTransport({ status: "idle", playheadSec: 0 });
  }, [commit]);

  const selectTrack = useCallback((trackId: string, clipId?: string | null, sheet = false) => {
    setSelectedTrackId(trackId);
    const track = projectRef.current.tracks.find((item) => item.id === trackId);
    setSelectedClipId(clipId === undefined ? (track?.clips[0]?.id ?? null) : clipId);
    if (sheet && viewportRef.current === "mobile") setInspectorOpen(true);
  }, []);

  const importFiles = useCallback(
    async (files: File[], trackId?: string) => {
      if (files.length === 0) return;
      await whenEngineReady();
      const context = contextRef.current;
      const engine = engineRef.current;
      if (!context || !engine) return;
      setImporting(true);
      setNotice(null);
      await engine.resumeFromUserGesture();
      let current = projectRef.current;
      let addedTrack: StudioTrack | null = null;
      for (const file of files) {
        if (largeFileWarning(file.size)) {
          setNotice("large-file");
          await waitForNextPaint();
        }
        const decoded = await loadStudioFile(file, (data) => context.decodeAudioData(data), {
          peakBars: studioPeakBarCount(viewportRef.current),
        });
        if (!decoded.ok) {
          setNotice(decoded.reason);
          continue;
        }
        if (decoded.warning) setNotice(decoded.warning);
        const result = trackId
          ? addImportedFileToTrack(current, trackId, decoded.file)
          : addImportedFileAsTrack(current, decoded.file, viewportRef.current);
        if (!result.ok) {
          setNotice(result.reason === "track-cap-reached" ? "track-cap-reached" : "unsupported-file");
          break;
        }
        current = result.project;
        addedTrack = trackId ? (current.tracks.find((track) => track.id === trackId) ?? null) : (current.tracks.at(-1) ?? null);
        if (!decoded.warning && !trackId && exceedsTrackWarning(current.tracks.length, viewportRef.current)) {
          setNotice("track-limit");
        }
      }
      commit(current);
      if (addedTrack) selectTrack(addedTrack.id, addedTrack.clips.at(-1)?.id ?? null, true);
      setImporting(false);
    },
    [commit, selectTrack, whenEngineReady],
  );

  const browse = useCallback((trackId?: string) => {
    addTargetRef.current = trackId ?? null;
    fileInputRef.current?.click();
  }, []);

  const onFileInput = useCallback(
    (files: FileList | null) => {
      const list = files ? Array.from(files) : [];
      const target = addTargetRef.current ?? undefined;
      addTargetRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
      void importFiles(list, target);
    },
    [importFiles],
  );

  const selectedTrack = project.tracks.find((track) => track.id === selectedTrackId) ?? null;
  const selectedClip = selectedTrack?.clips.find((clip) => clip.id === selectedClipId) ?? selectedTrack?.clips[0] ?? null;

  return {
    project,
    duration: projectDuration(project),
    playhead: displayedPlayhead,
    playheadNow,
    subscribePlayhead,
    transport,
    viewport,
    pixelsPerSecond,
    setPixelsPerSecond,
    notice,
    clearNotice: () => setNotice(null),
    renderingIds,
    importing,
    canPlay: canPlayStudioProject(project),
    mixerOpen,
    setMixerOpen,
    inspectorOpen,
    setInspectorOpen,
    exportOpen,
    setExportOpen,
    fileInputRef,
    selectedTrack,
    selectedClip,
    togglePlay,
    stop,
    seek,
    browse,
    onFileInput,
    importFiles,
    selectTrack,
    setMasterGain: (gainDb: number) => commit(setMasterGain(projectRef.current, gainDb)),
    setGain: (trackId: string, gainDb: number) => {
      const result = setTrackGain(projectRef.current, trackId, gainDb);
      if (result.ok) commit(result.project);
    },
    setMuted: (trackId: string, muted: boolean) => {
      const result = setTrackMuted(projectRef.current, trackId, muted);
      if (result.ok) commit(result.project);
    },
    setSolo: (trackId: string, solo: boolean) => {
      const result = setTrackSolo(projectRef.current, trackId, solo);
      if (result.ok) commit(result.project);
    },
    setTempo: (trackId: string, patch: Partial<StudioTempoSetting>) => {
      const result = setTrackTempo(projectRef.current, trackId, patch);
      if (result.ok) commit(result.project);
    },
    setPitch: (trackId: string, pitch: { semitones?: number; cents?: number }) => {
      const result = setTrackPitch(projectRef.current, trackId, pitch);
      if (result.ok) commit(result.project);
    },
    setStretchPreset: (trackId: string, preset: StretchPresetId) => {
      const result = setTrackStretchPreset(projectRef.current, trackId, preset);
      if (result.ok) commit(result.project);
    },
    setName: (trackId: string, name: string) => {
      const result = setTrackName(projectRef.current, trackId, name);
      if (result.ok) commit(result.project);
    },
    setOffset: (trackId: string, clipId: string, offsetSec: number) => {
      const result = setClipOffset(projectRef.current, trackId, clipId, offsetSec);
      if (result.ok) commit(result.project);
    },
    setTrim: (trackId: string, clipId: string, trim: { offsetSec?: number; trimStartSec?: number; trimEndSec?: number }) => {
      let current = projectRef.current;
      if (trim.offsetSec !== undefined) {
        const moved = setClipOffset(current, trackId, clipId, trim.offsetSec);
        if (!moved.ok) return;
        current = moved.project;
      }
      if (trim.trimStartSec !== undefined || trim.trimEndSec !== undefined) {
        const trimmed = setClipTrim(current, trackId, clipId, trim);
        if (!trimmed.ok) return;
        current = trimmed.project;
      }
      commit(current);
    },
    deleteTrack: (trackId: string) => {
      const result = removeTrack(projectRef.current, trackId);
      if (!result.ok) return;
      commit(result.project);
      if (selectedTrackId === trackId) {
        const next = result.project.tracks[0];
        setSelectedTrackId(next?.id ?? null);
        setSelectedClipId(next?.clips[0]?.id ?? null);
      }
    },
    deleteClip: (trackId: string, clipId: string) => {
      const result = removeClip(projectRef.current, trackId, clipId);
      if (!result.ok) return;
      commit(result.project);
      const track = result.project.tracks.find((item) => item.id === trackId);
      if (!track) {
        if (selectedTrackId === trackId) {
          const next = result.project.tracks[0];
          setSelectedTrackId(next?.id ?? null);
          setSelectedClipId(next?.clips[0]?.id ?? null);
        }
        return;
      }
      if (selectedClipId === clipId) setSelectedClipId(track.clips[0]?.id ?? null);
    },
  };
}

export type StudioSession = ReturnType<typeof useStudioSession>;
