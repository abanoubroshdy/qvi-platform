"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stretchAudioBufferOffThread } from "@/lib/audio-stretch-task";
import { createLiveStretchNode, enableLiveStretch } from "@/lib/audio-stretch-worklet";
import { isStudioTextTarget, sessionDisplayBpm, studioTransportCommand } from "@/lib/studio/chrome";
import { appendTap, tapBpmFromTimestamps } from "@/lib/audio-tempo";
import {
  STUDIO_METRONOME_LOOKAHEAD_SEC,
  STUDIO_METRONOME_SCHEDULE_MS,
  contextTimeForHeardClick,
  metronomeClicksInWindow,
  playMetronomeClick,
} from "@/lib/studio/metronome";
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
  addEmptyTrack,
  addImportedFileAsTrack,
  addTrack,
  largeFileWarning,
  addImportedFileToTrack,
  createStudioTrack,
  canPlayStudioProject,
  createStudioProject,
  moveClipToTrack,
  projectDuration,
  removeClip,
  STUDIO_DEFAULT_PROJECT_NAME,
  removeTrack,
  seekPlayhead,
  setClipOffset,
  setClipTrim,
  setMasterGain,
  setTrackCompressor,
  setTrackEq,
  setTrackGain,
  setTrackMuted,
  setTrackName,
  setTrackPan,
  setTrackPitch,
  setTrackSolo,
  setTrackStretchPreset,
  setTrackTempo,
  splitClip,
  stopPlayhead,
  trackTempoPitchIsIdentity,
} from "@/lib/studio/project";
import type { StretchPresetId } from "@/lib/audio-stretch-preset";
import { canAddTrack, exceedsTrackWarning, type StudioTempoSetting } from "@/lib/studio/definition";
import { StudioMicCapture, type MicProcessor } from "@/lib/studio/mic-capture";
import { micFailureNotice, nextRecordingName, punchInOffset, type StudioTrackEq } from "@/lib/studio/mix";
import { encodeWavPcm16, wavArrayBuffer } from "@/lib/studio/wav";
import {
  browserStudioSessionStore,
  restoreStudioProject,
  STUDIO_SESSION_SAVE_MS,
  studioSessionRecord,
  type StudioSessionAudio,
} from "@/lib/studio/session-store";
import type { StudioProject, StudioTrack } from "@/lib/studio/types";
import { viewportFromWidth, type StudioSnapMode, type StudioTimeRange } from "@/lib/studio/timeline-geometry";

export type StudioClipRef = { trackId: string; clipId: string };

export type StudioNoticeCode =
  | "large-file"
  | "track-cap-reached"
  | "track-limit"
  | "unsupported-file"
  | "decode-failed"
  | "preview-failed"
  | "save-failed"
  | "restore-failed"
  | "mic-denied"
  | "mic-unavailable"
  | "arm-track"
  | "recording-empty";

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

function rememberClipAudio(audio: StudioSessionAudio, before: StudioProject, after: StudioProject, bytes: ArrayBuffer) {
  const known = new Set<string>();
  for (const track of before.tracks) {
    for (const clip of track.clips) known.add(clip.id);
  }
  for (const track of after.tracks) {
    for (const clip of track.clips) {
      if (!known.has(clip.id)) audio.set(clip.id, bytes);
    }
  }
}

function copyClipAudio(audio: StudioSessionAudio, fromClipId: string, toClipId: string) {
  const bytes = audio.get(fromClipId);
  if (bytes) audio.set(toClipId, bytes.slice(0));
}

function pruneClipAudio(audio: StudioSessionAudio, project: StudioProject) {
  const live = new Set<string>();
  for (const track of project.tracks) {
    for (const clip of track.clips) live.add(clip.id);
  }
  const stale: string[] = [];
  audio.forEach((_, id) => {
    if (!live.has(id)) stale.push(id);
  });
  for (const id of stale) audio.delete(id);
}

export function useStudioSession() {
  const [project, setProject] = useState<StudioProject>(() => createStudioProject(STUDIO_DEFAULT_PROJECT_NAME));
  const projectRef = useRef(project);
  projectRef.current = project;
  const audioRef = useRef<StudioSessionAudio>(new Map());
  const saveEpochRef = useRef(0);
  const [sessionReady, setSessionReady] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [armedTrackId, setArmedTrackId] = useState<string | null>(null);
  const armedTrackIdRef = useRef<string | null>(null);
  armedTrackIdRef.current = armedTrackId;
  const [recording, setRecording] = useState(false);
  const captureRef = useRef<StudioMicCapture | null>(null);
  const punchRef = useRef(0);
  const [transport, setTransport] = useState<StudioTransportSnapshot>({ status: "idle", playheadSec: 0 });
  const [viewport, setViewport] = useState(() => viewportFromWidth(1024));
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selection, setSelection] = useState<StudioClipRef[]>([]);
  const [snapMode, setSnapMode] = useState<StudioSnapMode>("beat");
  const [timeRange, setTimeRange] = useState<StudioTimeRange | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const timeRangeRef = useRef<StudioTimeRange | null>(null);
  const loopEnabledRef = useRef(false);
  timeRangeRef.current = timeRange;
  loopEnabledRef.current = loopEnabled;
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimesRef = useRef<number[]>([]);
  const metronomeEnabledRef = useRef(false);
  metronomeEnabledRef.current = metronomeEnabled;
  const selectedTrackIdRef = useRef<string | null>(null);
  selectedTrackIdRef.current = selectedTrackId;
  const recordingRef = useRef(false);
  recordingRef.current = recording;
  const [pixelsPerSecond, setPixelsPerSecond] = useState(48);
  const [notice, setNotice] = useState<StudioNoticeCode | null>(null);
  const [renderingIds, setRenderingIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const engineRef = useRef<QviStudioPlaybackEngine | null>(null);
  const schedulerRef = useRef<ReturnType<typeof connectTempoPreview> | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addTargetRef = useRef<string | null>(null);
  const engineWaitersRef = useRef<Array<() => void>>([]);
  const playheadListenersRef = useRef(new Set<(seconds: number) => void>());
  const playheadRef = useRef(0);

  const commit = useCallback((next: StudioProject, sync = true) => {
    pruneClipAudio(audioRef.current, next);
    projectRef.current = next;
    setProject(next);
    if (sync) engineRef.current?.sync(next);
  }, []);

  useEffect(() => {
    const context = new AudioContext();
    contextRef.current = context;
    const host = createStudioAudioHost(context);
    const engine = createStudioPlaybackEngine({
      host,
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
    void enableLiveStretch(context).then((ok) => {
      if (cancelled || !ok) return;
      host.createLiveStretch = () => createLiveStretchNode(context);
      setLiveReady(true);
    });
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
    if (liveReady) {
      scheduler.cancel();
      setRenderingIds([]);
      engine.sync(projectRef.current);
      return;
    }
    const pending: string[] = [];
    for (const track of projectRef.current.tracks) {
      if (!trackTempoPitchIsIdentity(track)) {
        engine.setRenderedTrack(track.id, null);
        pending.push(track.id);
      }
      scheduler.schedule(track);
    }
    setRenderingIds(pending);
  }, [contentKey, liveReady]);

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
    let cancelled = false;
    const run = async () => {
      try {
        await whenEngineReady();
        if (cancelled) return;
        const context = contextRef.current;
        const stored = await browserStudioSessionStore().read();
        if (cancelled || !context) return;
        const untouched =
          projectRef.current.tracks.length === 0 &&
          projectRef.current.name === STUDIO_DEFAULT_PROJECT_NAME &&
          audioRef.current.size === 0;
        if (stored && untouched) {
          setRestoring(true);
          const restored = await restoreStudioProject(stored, (data) => context.decodeAudioData(data));
          if (cancelled || !restored) return;
          const stillUntouched =
            projectRef.current.tracks.length === 0 &&
            projectRef.current.name === STUDIO_DEFAULT_PROJECT_NAME &&
            audioRef.current.size === 0;
          if (!stillUntouched) return;
          audioRef.current = restored.audio;
          commit(restored.project);
          const first = restored.project.tracks[0];
          setSelectedTrackId(first?.id ?? null);
          setSelectedClipId(first?.clips[0]?.id ?? null);
          setSelection(first?.clips[0] ? [{ trackId: first.id, clipId: first.clips[0].id }] : []);
          publishPlayhead(restored.project.playheadSec);
          setTransport({ status: "idle", playheadSec: restored.project.playheadSec });
        }
      } catch {
        if (!cancelled) setNotice("restore-failed");
      } finally {
        if (!cancelled) {
          setRestoring(false);
          setSessionReady(true);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [commit, publishPlayhead, whenEngineReady]);

  useEffect(() => {
    if (!sessionReady) return;
    const token = saveEpochRef.current;
    const timer = window.setTimeout(() => {
      if (saveEpochRef.current !== token) return;
      const writeCurrent = () => browserStudioSessionStore().write(studioSessionRecord(projectRef.current, audioRef.current));
      void writeCurrent()
        .then(() => {
          if (saveEpochRef.current !== token) return writeCurrent();
        })
        .catch(() => setNotice("save-failed"));
    }, STUDIO_SESSION_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [project, sessionReady]);

  useEffect(() => {
    if (transport.status !== "playing") return;
    let frame = 0;
    const tick = () => {
      const engine = engineRef.current;
      if (!engine || engine.currentStatus() !== "playing") return;
      const snap = engine.poll();
      const range = timeRangeRef.current;
      const looping = loopEnabledRef.current && range !== null;
      if (looping && range && snap.playheadSec >= range.endSec - 1e-4) {
        const next = seekPlayhead(projectRef.current, range.startSec);
        projectRef.current = next;
        setProject(next);
        if (snap.status !== "playing") {
          engine.play(next);
        } else {
          engine.seek(range.startSec);
        }
        setTransport({ status: "playing", playheadSec: range.startSec });
        publishPlayhead(range.startSec);
        frame = requestAnimationFrame(tick);
        return;
      }
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

  useEffect(() => {
    const active = metronomeEnabled && (transport.status === "playing" || recording);
    if (!active) return;
    const context = contextRef.current;
    if (!context) return;
    let nextHeard = -1;
    let freeNextAt = context.currentTime;
    let freeBeat = 0;
    const timer = window.setInterval(() => {
      if (!metronomeEnabledRef.current) return;
      const engine = engineRef.current;
      const playing = engine?.currentStatus() === "playing";
      const bpm =
        sessionDisplayBpm(projectRef.current.tracks, selectedTrackIdRef.current) ?? 120;
      if (playing && engine) {
        const playhead = engine.currentPlayhead();
        const from = Math.max(playhead, nextHeard);
        const to = playhead + STUDIO_METRONOME_LOOKAHEAD_SEC;
        const clicks = metronomeClicksInWindow(from, to, bpm);
        for (const click of clicks) {
          if (click.timeSec < nextHeard) continue;
          const when = contextTimeForHeardClick(click.timeSec, playhead, context.currentTime);
          playMetronomeClick(context, when, click.accent);
          nextHeard = click.timeSec + 1e-4;
        }
        return;
      }
      if (!recordingRef.current) return;
      const horizon = context.currentTime + STUDIO_METRONOME_LOOKAHEAD_SEC;
      const beat = Math.max(1e-3, 60 / (Number.isFinite(bpm) && bpm > 0 ? bpm : 120));
      while (freeNextAt < horizon) {
        playMetronomeClick(context, freeNextAt, freeBeat % 4 === 0);
        freeNextAt += beat;
        freeBeat += 1;
      }
    }, STUDIO_METRONOME_SCHEDULE_MS);
    return () => window.clearInterval(timer);
  }, [metronomeEnabled, recording, transport.status]);

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

  const stopRef = useRef(stop);
  const seekRef = useRef(seek);
  stopRef.current = stop;
  seekRef.current = seek;

  const tapTempo = useCallback(() => {
    const now = performance.now();
    const next = appendTap(tapTimesRef.current, now);
    tapTimesRef.current = next;
    setTapCount(next.length);
    const bpm = tapBpmFromTimestamps(next);
    if (bpm == null) return;
    const tracks = projectRef.current.tracks;
    const track = tracks.find((item) => item.id === selectedTrackIdRef.current) ?? tracks[0] ?? null;
    if (!track) return;
    if (track.tempo.mode === "bpm") {
      const sync = Math.abs(track.tempo.targetBpm - track.tempo.originalBpm) < 0.05;
      const result = setTrackTempo(
        projectRef.current,
        track.id,
        sync ? { originalBpm: bpm, targetBpm: bpm } : { targetBpm: bpm },
      );
      if (result.ok) commit(result.project);
      return;
    }
    const result = setTrackTempo(projectRef.current, track.id, {
      mode: "bpm",
      originalBpm: bpm,
      targetBpm: bpm,
    });
    if (result.ok) commit(result.project);
  }, [commit]);

  const resetTaps = useCallback(() => {
    tapTimesRef.current = [];
    setTapCount(0);
  }, []);

  const tapTempoRef = useRef(tapTempo);
  tapTempoRef.current = tapTempo;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isStudioTextTarget(event.target)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setTimeRange(null);
        setLoopEnabled(false);
        return;
      }
      if ((event.key === "t" || event.key === "T") && !event.repeat) {
        event.preventDefault();
        tapTempoRef.current();
        return;
      }
      if ((event.key === "m" || event.key === "M") && !event.repeat) {
        event.preventDefault();
        setMetronomeEnabled((value) => !value);
        return;
      }
      const command = studioTransportCommand(event);
      if (!command) return;
      event.preventDefault();
      if (command.action === "play-pause") {
        void toggleRef.current();
        return;
      }
      if (command.action === "stop") {
        stopRef.current();
        return;
      }
      const engine = engineRef.current;
      const now = engine ? engine.currentPlayhead() : projectRef.current.playheadSec;
      seekRef.current(now + command.deltaSec);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const readMeters = useCallback(
    () => engineRef.current?.readMeters() ?? { master: 0, tracks: {} },
    [],
  );

  const selectTrack = useCallback((trackId: string, clipId?: string | null, sheet = false) => {
    setSelectedTrackId(trackId);
    const track = projectRef.current.tracks.find((item) => item.id === trackId);
    const nextClipId = clipId === undefined ? (track?.clips[0]?.id ?? null) : clipId;
    setSelectedClipId(nextClipId);
    setSelection(nextClipId ? [{ trackId, clipId: nextClipId }] : []);
    if (sheet && viewportRef.current === "mobile") setInspectorOpen(true);
  }, []);

  const selectClip = useCallback((trackId: string, clipId: string, mode: "replace" | "add") => {
    setSelectedTrackId(trackId);
    setSelectedClipId(clipId);
    setSelection((current) => {
      if (mode === "replace") return [{ trackId, clipId }];
      if (current.some((item) => item.trackId === trackId && item.clipId === clipId)) return current;
      return [...current, { trackId, clipId }];
    });
  }, []);

  const moveClipGroup = useCallback(
    (group: readonly StudioClipRef[], anchor: StudioClipRef, nextOffsetSec: number, targetTrackId?: string) => {
      const anchorClip = projectRef.current.tracks
        .find((track) => track.id === anchor.trackId)
        ?.clips.find((clip) => clip.id === anchor.clipId);
      if (!anchorClip) return;
      const delta = nextOffsetSec - anchorClip.offsetSec;
      const destTrackId = targetTrackId ?? anchor.trackId;
      if (Math.abs(delta) < 1e-4 && destTrackId === anchor.trackId) return;
      let current = projectRef.current;
      for (const item of group) {
        const clip = current.tracks.find((track) => track.id === item.trackId)?.clips.find((entry) => entry.id === item.clipId);
        if (!clip) continue;
        const result = moveClipToTrack(current, item.trackId, item.clipId, destTrackId, clip.offsetSec + delta);
        if (result.ok) current = result.project;
      }
      commit(current);
      if (destTrackId !== anchor.trackId) {
        setSelection(group.map((item) => ({ trackId: destTrackId, clipId: item.clipId })));
        setSelectedTrackId(destTrackId);
        setSelectedClipId(anchor.clipId);
      }
    },
    [commit],
  );

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
        rememberClipAudio(audioRef.current, current, result.project, decoded.sourceBytes);
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

  const finishRecording = useCallback(async () => {
    const capture = captureRef.current;
    captureRef.current = null;
    setRecording(false);
    const buffer = capture?.stop() ?? null;
    const trackId = armedTrackIdRef.current;
    if (!buffer || buffer.length < 1 || !trackId) {
      if (capture) setNotice("recording-empty");
      return;
    }
    await whenEngineReady();
    const context = contextRef.current;
    if (!context) return;
    const names = projectRef.current.tracks.flatMap((track) => track.clips.map((clip) => clip.fileName));
    const wav = wavArrayBuffer(encodeWavPcm16(buffer));
    const file = new File([wav], nextRecordingName(names), { type: "audio/wav" });
    const decoded = await loadStudioFile(file, (data) => context.decodeAudioData(data));
    if (!decoded.ok) {
      setNotice(decoded.reason === "unsupported-file" ? "unsupported-file" : "decode-failed");
      return;
    }
    const before = projectRef.current;
    const added = addImportedFileToTrack(before, trackId, decoded.file);
    if (!added.ok) {
      setNotice(added.reason === "track-cap-reached" ? "track-cap-reached" : "unsupported-file");
      return;
    }
    rememberClipAudio(audioRef.current, before, added.project, decoded.sourceBytes);
    const clipId = added.project.tracks.find((track) => track.id === trackId)?.clips.at(-1)?.id ?? null;
    const punched = clipId ? setClipOffset(added.project, trackId, clipId, punchInOffset(punchRef.current)) : null;
    commit(punched && punched.ok ? punched.project : added.project);
    if (clipId) selectTrack(trackId, clipId, true);
  }, [commit, selectTrack, whenEngineReady]);

  const toggleRecord = useCallback(async () => {
    if (captureRef.current) {
      await finishRecording();
      return;
    }
    let trackId = armedTrackIdRef.current;
    if (!trackId && projectRef.current.tracks.length === 0) {
      const track = createStudioTrack({ name: "Recording", index: 0 });
      const added = addTrack(projectRef.current, track, viewportRef.current);
      if (!added.ok) {
        setNotice(added.reason === "track-cap-reached" ? "track-cap-reached" : "unsupported-file");
        return;
      }
      commit(added.project);
      trackId = track.id;
      armedTrackIdRef.current = track.id;
      setArmedTrackId(track.id);
      selectTrack(track.id, null, true);
    }
    if (!trackId) {
      setNotice("arm-track");
      return;
    }
    const context = contextRef.current;
    const engine = engineRef.current;
    if (!context || !engine) return;
    await engine.resumeFromUserGesture();
    const capture = new StudioMicCapture({
      sampleRate: context.sampleRate,
      destination: context.destination,
      getUserMedia: (constraints) => {
        const request = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
        if (!request) return Promise.reject(Object.assign(new Error("No microphone"), { name: "NotFoundError" }));
        return request(constraints);
      },
      createMediaStreamSource: (stream) => context.createMediaStreamSource(stream),
      createScriptProcessor: (size, inputs, outputs) => context.createScriptProcessor(size, inputs, outputs) as unknown as MicProcessor,
      createGain: () => context.createGain(),
      createBuffer: (channels, length, sampleRate) => context.createBuffer(channels, length, sampleRate),
    });
    try {
      await capture.start();
    } catch (error) {
      capture.dispose();
      setNotice(micFailureNotice(error));
      return;
    }
    captureRef.current = capture;
    const playing = engine.currentStatus() === "playing";
    punchRef.current = punchInOffset(playing ? engine.currentPlayhead() : projectRef.current.playheadSec);
    setRecording(true);
    setNotice(null);
  }, [commit, finishRecording, selectTrack]);

  useEffect(() => () => captureRef.current?.dispose(), []);

  const clearTimeRange = useCallback(() => {
    setTimeRange(null);
    setLoopEnabled(false);
  }, []);

  const assignTimeRange = useCallback((range: StudioTimeRange | null) => {
    setTimeRange(range);
    if (!range) setLoopEnabled(false);
  }, []);

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
    liveReady,
    fileInputRef,
    selectedTrack,
    selectedClip,
    selection,
    snapMode,
    setSnapMode,
    timeRange,
    setTimeRange: assignTimeRange,
    clearTimeRange,
    loopEnabled,
    setLoopEnabled,
    metronomeEnabled,
    setMetronomeEnabled: (enabled: boolean) => {
      setMetronomeEnabled(enabled);
      if (enabled) void engineRef.current?.resumeFromUserGesture();
    },
    tapTempo,
    resetTaps,
    tapCount,
    selectClip,
    moveClipGroup,
    addEmptyTrack: () => {
      if (!canAddTrack(projectRef.current.tracks.length, viewportRef.current)) {
        setNotice("track-cap-reached");
        return;
      }
      const result = addEmptyTrack(projectRef.current, viewportRef.current);
      if (!result.ok) {
        setNotice(result.reason === "track-cap-reached" ? "track-cap-reached" : "track-limit");
        return;
      }
      commit(result.project);
      const track = result.project.tracks.at(-1);
      if (track) selectTrack(track.id, null);
      if (exceedsTrackWarning(result.project.tracks.length, viewportRef.current)) setNotice("track-limit");
    },
    splitSelectedAtPlayhead: () => {
      const trackId = selectedTrackId;
      const clipId = selectedClipId;
      if (!trackId || !clipId) return;
      const before = projectRef.current;
      const result = splitClip(before, trackId, clipId, playheadRef.current);
      if (!result.ok) return;
      const beforeIds = new Set<string>();
      for (const track of before.tracks) {
        for (const clip of track.clips) beforeIds.add(clip.id);
      }
      const created = result.project.tracks
        .find((track) => track.id === trackId)
        ?.clips.find((clip) => !beforeIds.has(clip.id));
      if (created) copyClipAudio(audioRef.current, clipId, created.id);
      commit(result.project);
      if (created) {
        setSelectedClipId(created.id);
        setSelection([
          { trackId, clipId },
          { trackId, clipId: created.id },
        ]);
      }
    },
    restoring,
    armedTrackId,
    setArmedTrack: (trackId: string | null) => setArmedTrackId(trackId),
    recording,
    toggleRecord: () => void toggleRecord(),
    setPan: (trackId: string, pan: number) => {
      const result = setTrackPan(projectRef.current, trackId, pan);
      if (result.ok) commit(result.project);
    },
    setEq: (trackId: string, patch: Partial<StudioTrackEq>) => {
      const result = setTrackEq(projectRef.current, trackId, patch);
      if (result.ok) commit(result.project);
    },
    setCompressor: (trackId: string, amount: number) => {
      const result = setTrackCompressor(projectRef.current, trackId, amount);
      if (result.ok) commit(result.project);
    },
    setProjectName: (name: string) => {
      const current = projectRef.current;
      if (name === current.name) return;
      commit({ ...current, name });
    },
    newProject: () => {
      saveEpochRef.current += 1;
      captureRef.current?.dispose();
      captureRef.current = null;
      setRecording(false);
      setArmedTrackId(null);
      engineRef.current?.stop();
      audioRef.current = new Map();
      setSelectedTrackId(null);
      setSelectedClipId(null);
      setSelection([]);
      setTimeRange(null);
      setLoopEnabled(false);
      setMetronomeEnabled(false);
      tapTimesRef.current = [];
      setTapCount(0);
      setNotice(null);
      commit(createStudioProject(STUDIO_DEFAULT_PROJECT_NAME));
      setTransport({ status: "idle", playheadSec: 0 });
      publishPlayhead(0);
      void browserStudioSessionStore()
        .clear()
        .catch(() => setNotice("save-failed"));
    },
    togglePlay,
    stop,
    seek,
    readMeters,
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
      if (armedTrackIdRef.current === trackId) setArmedTrackId(null);
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
