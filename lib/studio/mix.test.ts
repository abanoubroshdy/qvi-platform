import { describe, expect, it } from "vitest";
import { StudioMicCapture, type MicProcessEvent, type MicProcessor } from "@/lib/studio/mic-capture";
import {
  compressorFromAmount,
  concatChannelFrames,
  formatPan,
  micFailureNotice,
  nextRecordingName,
  normalizeTrackMix,
  punchInOffset,
} from "@/lib/studio/mix";
import { addImportedFileAsTrack, createStudioProject, projectFromSnapshot, setTrackCompressor, setTrackEq, setTrackPan, snapshotStudioProject } from "@/lib/studio/project";

describe("studio mix and recording", () => {
  it("clamps pan and eq and maps a light compressor", () => {
    expect(normalizeTrackMix(null)).toEqual({ pan: 0, eq: { lowDb: 0, midDb: 0, highDb: 0 }, compressor: 0 });
    expect(normalizeTrackMix({ pan: 4, eq: { lowDb: -40, highDb: 9 }, compressor: 2 })).toEqual({
      pan: 1,
      eq: { lowDb: -12, midDb: 0, highDb: 9 },
      compressor: 1,
    });
    expect(compressorFromAmount(0)).toMatchObject({ threshold: 0, ratio: 1 });
    expect(compressorFromAmount(1)).toMatchObject({ threshold: -24, ratio: 4, knee: 6 });
    expect(formatPan(0)).toBe("C");
    expect(formatPan(-0.5)).toBe("L50");
    expect(formatPan(1)).toBe("R100");
  });

  it("names takes and punches in at the playhead", () => {
    expect(nextRecordingName([])).toBe("Take 1.wav");
    expect(nextRecordingName(["Take 2.wav", "drums.wav", "take 9.wav"])).toBe("Take 10.wav");
    expect(punchInOffset(1.25)).toBe(1.25);
    expect(punchInOffset(-4)).toBe(0);
    expect(micFailureNotice({ name: "NotAllowedError" })).toBe("mic-denied");
    expect(micFailureNotice({ name: "NotFoundError" })).toBe("mic-unavailable");
  });

  it("keeps pan, eq, and compressor on the snapshot", () => {
    const added = addImportedFileAsTrack(
      createStudioProject("Demo", "project-1"),
      {
        fileName: "drums.wav",
        byteLength: 8,
        sourceDurationSec: 1,
        sampleRate: 44100,
        channels: 1,
        peaks: [0.1],
      },
      "desktop",
    );
    if (!added.ok) throw new Error(added.reason);
    const trackId = added.project.tracks[0]!.id;
    let project = setTrackPan(added.project, trackId, -0.4).project;
    if (!setTrackPan(added.project, trackId, -0.4).ok) throw new Error("pan");
    const eq = setTrackEq(project, trackId, { lowDb: 3, highDb: -2 });
    if (!eq.ok) throw new Error("eq");
    const compressed = setTrackCompressor(eq.project, trackId, 0.5);
    if (!compressed.ok) throw new Error("comp");
    project = compressed.project;
    const snapshot = snapshotStudioProject(project);
    expect(snapshot.tracks[0]).toMatchObject({ pan: -0.4, eq: { lowDb: 3, midDb: 0, highDb: -2 }, compressor: 0.5 });
    expect(JSON.stringify(snapshot)).not.toContain("secret-pcm");
    const legacy = structuredClone(snapshot);
    for (const track of legacy.tracks) {
      const loose = track as unknown as { pan?: number; eq?: unknown; compressor?: number };
      delete loose.pan;
      delete loose.eq;
      delete loose.compressor;
    }
    const restored = projectFromSnapshot(legacy);
    expect(restored.tracks[0]).toMatchObject({ pan: 0, eq: { lowDb: 0, midDb: 0, highDb: 0 }, compressor: 0 });
  });

  it("copies microphone frames into a buffer and stays out of the speakers", async () => {
    const channels = [new Float32Array(4)];
    let processor: MicProcessor | null = null;
    const connections: string[] = [];
    const capture = new StudioMicCapture({
      sampleRate: 8000,
      destination: { connect() {}, disconnect() {} },
      getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream,
      createMediaStreamSource: () => ({
        connect() {
          connections.push("source");
        },
        disconnect() {},
      }),
      createScriptProcessor: () => {
        processor = {
          onaudioprocess: null,
          connect(destination) {
            connections.push("processor");
            void destination;
          },
          disconnect() {},
        };
        return processor;
      },
      createGain: () => ({
        gain: { value: 1 },
        connect() {
          connections.push("sink");
        },
        disconnect() {},
      }),
      createBuffer: (_channels, length, sampleRate) =>
        ({
          length,
          sampleRate,
          numberOfChannels: 1,
          getChannelData: () => channels[0]!,
        }) as unknown as AudioBuffer,
    });
    await capture.start();
    const event: MicProcessEvent = {
      inputBuffer: {
        numberOfChannels: 1,
        sampleRate: 8000,
        getChannelData: () => Float32Array.of(0.25, -0.5),
      },
    };
    processor!.onaudioprocess?.(event);
    processor!.onaudioprocess?.(event);
    const buffer = capture.stop();
    expect(concatChannelFrames([Float32Array.of(0.25, -0.5), Float32Array.of(0.25, -0.5)])).toEqual(Float32Array.of(0.25, -0.5, 0.25, -0.5));
    expect(buffer?.length).toBe(4);
    expect(buffer?.getChannelData(0)[0]).toBeCloseTo(0.25);
    expect(buffer?.getChannelData(0)[1]).toBeCloseTo(-0.5);
    expect(connections).toEqual(["source", "processor", "sink"]);
  });
});
