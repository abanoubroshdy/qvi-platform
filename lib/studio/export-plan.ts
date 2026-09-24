/**
 * Bounce plan for one QVI Studio mix.
 * Clips on a track sum first, then the track gain, then the tracks, then the master.
 * amix does not attenuate (normalize=0) so the sum matches Web Audio playback.
 *
 * Each input is already source-trimmed and time-stretched. This graph only
 * places clips, matches the export format, and sums them. Tempo and pitch
 * are not ffmpeg filters.
 */

import { clampGainDb } from "@/lib/audio-edit";
import {
  audioCodecArgs,
  audioExportMimeType,
  audioExportOutputName,
  clampAudioExportSettings,
  type AudioExportSettings,
} from "@/lib/audio-export";
import { formatFilterNumber } from "@/lib/audio-tempo";
import {
  audibleTracks,
  sourceClipDuration,
  type StudioExportFormat,
} from "@/lib/studio/definition";
import { audibleDuration, projectExportBlockReason } from "@/lib/studio/project";
import type { StudioClip, StudioProject, StudioTrack } from "@/lib/studio/types";

const MIN_SLICE_SEC = 1e-4;

export type StudioExportInput = {
  name: string;
  clipId: string;
  trackId: string;
};

export type StudioExportPlan =
  | { ok: false; reason: "empty-project" | "nothing-audible" | "missing-buffer" }
  | {
      ok: true;
      format: StudioExportFormat;
      fileName: string;
      mimeType: string;
      outputName: string;
      filterComplex: string;
      estimatedDuration: number;
      inputs: StudioExportInput[];
      args: string[];
      fallbackArgs: string[][];
    };

export function studioExportFileName(projectName: string, format: StudioExportFormat): string {
  const cleaned = projectName.replace(/[/\\?%*:|"<>]/g, " ").replace(/\s+/g, " ").trim();
  return `${cleaned || "QVI Studio"}.${format}`;
}

export function planStudioExport(
  project: StudioProject,
  format: StudioExportFormat,
  settings: AudioExportSettings,
): StudioExportPlan {
  const blocked = projectExportBlockReason(project);
  if (blocked === "empty-project" || blocked === "nothing-audible") return { ok: false, reason: blocked };

  const stream = clampAudioExportSettings(format, settings);
  const inputs: StudioExportInput[] = [];
  const chains: string[] = [];
  const trackLabels: string[] = [];

  for (const track of audibleTracks(project.tracks)) {
    const clipLabels: string[] = [];
    for (const clip of audibleClips(track)) {
      if (!clip.buffer) return { ok: false, reason: "missing-buffer" };
      const index = inputs.length;
      const name = `clip${index}.wav`;
      inputs.push({ name, clipId: clip.id, trackId: track.id });
      const label = `c${index}`;
      chains.push(clipChain(index, label, clip, stream));
      clipLabels.push(label);
    }
    if (!clipLabels.length) continue;
    const trackLabel = `t${trackLabels.length}`;
    chains.push(sumBus(clipLabels, trackLabel, `volume=${dbArg(track.gainDb)}dB`));
    trackLabels.push(trackLabel);
  }

  if (!inputs.length || !trackLabels.length) return { ok: false, reason: "nothing-audible" };

  chains.push(sumBus(trackLabels, "out", `volume=${dbArg(project.masterGainDb)}dB`));
  const filterComplex = chains.join(";");
  const outputName = audioExportOutputName(format);
  const codec = audioCodecArgs(format, stream);
  const inputArgs = inputs.flatMap((input) => ["-i", input.name]);
  const mapped = [...inputArgs, "-filter_complex", filterComplex, "-map", "[out]", "-vn", ...codec, outputName];
  const unmapped = [...inputArgs, "-filter_complex", filterComplex, "-vn", ...codec, outputName];

  return {
    ok: true,
    format,
    fileName: studioExportFileName(project.name, format),
    mimeType: audioExportMimeType(format),
    outputName,
    filterComplex,
    estimatedDuration: audibleDuration(project),
    inputs,
    args: mapped,
    fallbackArgs: [unmapped],
  };
}

function audibleClips(track: StudioTrack): StudioClip[] {
  return track.clips.filter((clip) => sourceClipDuration(clip) >= MIN_SLICE_SEC);
}

function clipChain(index: number, label: string, clip: StudioClip, stream: AudioExportSettings): string {
  const parts = [`aformat=sample_rates=${stream.sampleRate}:channel_layouts=${stream.channels === 1 ? "mono" : "stereo"}`];
  const delayMs = Math.round(Math.max(0, clip.offsetSec) * 1000);
  if (delayMs > 0) {
    const delay = stream.channels === 1 ? String(delayMs) : `${delayMs}|${delayMs}`;
    parts.push(`adelay=${delay}`);
  }
  return `[${index}:a]${parts.join(",")}[${label}]`;
}

/** One label passes through. Several labels sum with amix and no automatic attenuation. */
function sumBus(labels: string[], output: string, tail: string): string {
  if (labels.length === 1) return `[${labels[0]}]${tail}[${output}]`;
  const inputs = labels.map((label) => `[${label}]`).join("");
  return `${inputs}amix=inputs=${labels.length}:duration=longest:dropout_transition=0:normalize=0,${tail}[${output}]`;
}

function dbArg(gainDb: number): string {
  return formatFilterNumber(clampGainDb(gainDb), 3);
}
