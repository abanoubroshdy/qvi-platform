import { describe, expect, it } from "vitest";
import { MAX_GAIN_DB, MIN_GAIN_DB } from "@/lib/audio-edit";
import {
  DEFAULT_BPM,
  MAX_BPM,
  MAX_CENTS,
  MAX_SEMITONES,
  MAX_TEMPO_PERCENT,
  MIN_BPM,
  MIN_CENTS,
  MIN_SEMITONES,
  MIN_TEMPO_PERCENT,
} from "@/lib/audio-tempo";
import { FFMPEG_LARGE_FILE_BYTES } from "@/lib/ffmpeg";
import {
  audibleTracks,
  canAddTrack,
  exceedsTrackWarning,
  canPlayProject,
  clipTimelineEnd,
  defaultClipOffset,
  exportBlockReason,
  heardClipDuration,
  isTrackAudible,
  qviStudioBreakpoints,
  qviStudioEngines,
  qviStudioLimits,
  qviStudioPhase0Boundary,
  qviStudioProduct,
  qviStudioSurfaces,
  qviStudioV1Capabilities,
  qviStudioV1NonGoals,
  studioExportFormats,
  studioExportFormatsFitPlatform,
  studioRejectReasons,
  timelineDuration,
  trackAddBlockReason,
} from "@/lib/studio/definition";

const unityTempo = {
  mode: "bpm" as const,
  originalBpm: 120,
  targetBpm: 120,
  percent: 0,
};

describe("QVI Studio phase 0 contract", () => {
  it("names the product and keeps it off the tools hub", () => {
    expect(qviStudioProduct).toMatchObject({
      name: "QVI Studio",
      version: "v1",
      kind: "miniature-daw",
      privacy: "on-device-only",
    });
    expect(qviStudioSurfaces.homepageRoute).toBe("/");
    expect(qviStudioSurfaces.homepageRole).toBe("product-home");
    expect(qviStudioSurfaces.workspaceRoute).toBe("/studio");
    expect(qviStudioSurfaces.sameSessionOnHomeAndWorkspace).toBe(false);
    expect(qviStudioSurfaces.listedInToolsHub).toBe(false);
    expect(qviStudioSurfaces.siblingLinks).toEqual(["qv1", "neyora", "tools"]);
  });

  it("keeps capability ids unique and disjoint from non-goals", () => {
    const capabilityIds = qviStudioV1Capabilities.map((item) => item.id);
    const nonGoalIds = qviStudioV1NonGoals.map((item) => item.id);
    expect(new Set(capabilityIds).size).toBe(capabilityIds.length);
    expect(new Set(nonGoalIds).size).toBe(nonGoalIds.length);
    expect(capabilityIds.filter((id) => (nonGoalIds as readonly string[]).includes(id))).toEqual([]);
    expect(capabilityIds).toEqual([
      "import-audio-files",
      "multi-clip-tracks",
      "shared-timeline",
      "clip-offset-and-trim",
      "track-mixer",
      "per-track-tempo-pitch",
      "global-transport",
      "export-mix",
      "responsive-shell",
      "local-session-restore",
      "track-pan",
      "track-eq-compressor",
      "live-recording",
    ]);
  });

  it("locks playback and export onto different runtimes", () => {
    expect(qviStudioEngines.playback.runtime).toBe("web-audio");
    expect(qviStudioEngines.export.runtime).toBe("ffmpeg-wasm");
    expect(qviStudioEngines.playback.runtime).not.toBe(qviStudioEngines.export.runtime);
    expect(qviStudioEngines.tempoPitchPreview.strategy).toBe("audio-worklet");
    expect(qviStudioEngines.tempoPitchPreview.fallback).toBe("offline-render");
    expect(qviStudioEngines.tempoPitchPreview.liveStretch).toBe("wsola");
    expect(qviStudioEngines.tempoPitchPreview.engine).toBe("soundtouch");
    expect(qviStudioEngines.tempoPitchPreview.stretch).toBe("phase-vocoder");
    expect(qviStudioEngines.tempoPitchPreview.forbiddenStrategies).toContain("playback-rate-only");
    expect(qviStudioEngines.tempoPitchPreview.rubberband).toBe(false);
    expect(qviStudioEngines.export.rubberband).toBe(false);
    expect(qviStudioEngines.export.tempoPitch).toBe("soundtouch");
    expect(qviStudioEngines.export.mix).toBe("amix");
    expect(qviStudioEngines.playback.startPolicy).toBe("resume-after-user-gesture");
  });

  it("reuses the existing tempo, gain, and file-size limits", () => {
    expect(qviStudioLimits.tempo).toEqual({
      minBpm: MIN_BPM,
      maxBpm: MAX_BPM,
      defaultBpm: DEFAULT_BPM,
      minPercent: MIN_TEMPO_PERCENT,
      maxPercent: MAX_TEMPO_PERCENT,
      minSemitones: MIN_SEMITONES,
      maxSemitones: MAX_SEMITONES,
      minCents: MIN_CENTS,
      maxCents: MAX_CENTS,
    });
    expect(qviStudioLimits.gainDb).toEqual({ min: MIN_GAIN_DB, max: MAX_GAIN_DB, unity: 0 });
    expect(qviStudioLimits.largeFileBytes).toBe(FFMPEG_LARGE_FILE_BYTES);
    expect(qviStudioLimits.previewDebounceMs).toBe(700);
    expect(studioExportFormats).toEqual(["mp3", "wav"]);
    expect(studioExportFormatsFitPlatform()).toBe(true);
  });

  it("keeps viewport ranges contiguous with the site breakpoints", () => {
    expect(qviStudioBreakpoints.tabletMinPx).toBe(qviStudioBreakpoints.mobileMaxPx + 1);
    expect(qviStudioBreakpoints.desktopMinPx).toBe(qviStudioBreakpoints.tabletMaxPx + 1);
    expect(qviStudioBreakpoints.desktopMinPx).toBe(1024);
  });

  it("does not ship UI from this phase", () => {
    expect(qviStudioPhase0Boundary.doesNotDeliver).toEqual(
      expect.arrayContaining(["components", "routes", "homepage-ui", "playback-engine"]),
    );
    expect(qviStudioPhase0Boundary.delivers).toContain("audibility-rule");
  });
});

describe("studio audibility", () => {
  const tracks = [
    { id: "a", muted: false, solo: false },
    { id: "b", muted: true, solo: false },
    { id: "c", muted: false, solo: true },
    { id: "d", muted: true, solo: true },
  ];

  it("plays every unmuted track when nothing is solo", () => {
    expect(isTrackAudible({ muted: false, solo: false }, false)).toBe(true);
    expect(isTrackAudible({ muted: true, solo: false }, false)).toBe(false);
  });

  it("keeps only unmuted solo tracks when any solo is on", () => {
    expect(audibleTracks(tracks).map((track) => track.id)).toEqual(["c"]);
  });
});

describe("studio timeline math", () => {
  it("places a new track clip at 0 and an added clip at the heard end", () => {
    expect(defaultClipOffset([])).toBe(0);
    expect(defaultClipOffset([4, 10.5])).toBe(10.5);
  });

  it("shortens heard length when tempo doubles and ignores pitch", () => {
    const doubled = { mode: "bpm" as const, originalBpm: 120, targetBpm: 240, percent: 0 };
    expect(heardClipDuration(10, doubled)).toBe(5);
    expect(heardClipDuration(10, unityTempo)).toBe(10);
  });

  it("measures the project through muted clips and the bounce through audible ones", () => {
    const clip = { offsetSec: 2, trimStartSec: 0, trimEndSec: 8 };
    expect(clipTimelineEnd(clip, unityTempo)).toBe(10);
    expect(
      timelineDuration([
        { clip, tempo: unityTempo },
        { clip: { offsetSec: 0, trimStartSec: 1, trimEndSec: 4 }, tempo: unityTempo },
      ]),
    ).toBe(10);
  });

  it("blocks play and export when there is nothing to hear", () => {
    expect(canPlayProject(0)).toBe(false);
    expect(canPlayProject(1)).toBe(true);
    expect(exportBlockReason({ clipCount: 0, audibleClipCount: 0 })).toBe(studioRejectReasons.emptyProject);
    expect(exportBlockReason({ clipCount: 2, audibleClipCount: 0 })).toBe(studioRejectReasons.nothingAudible);
    expect(exportBlockReason({ clipCount: 2, audibleClipCount: 1 })).toBeNull();
  });

  it("blocks an extra track only on the mobile cap", () => {
    expect(canAddTrack(8, "mobile")).toBe(false);
    expect(trackAddBlockReason(8, "mobile")).toBe(studioRejectReasons.trackCapReached);
    expect(canAddTrack(7, "mobile")).toBe(true);
    expect(canAddTrack(12, "tablet")).toBe(true);
    expect(canAddTrack(16, "desktop")).toBe(true);
    expect(exceedsTrackWarning(8, "mobile")).toBe(false);
    expect(exceedsTrackWarning(11, "tablet")).toBe(false);
    expect(exceedsTrackWarning(12, "tablet")).toBe(true);
    expect(exceedsTrackWarning(16, "desktop")).toBe(true);
  });
});
