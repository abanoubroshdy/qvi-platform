import { describe, expect, it } from "vitest";
import {
  addImportedFileAsTrack,
  createStudioProject,
  finishedProjectName,
  setClipOffset,
  setMasterGain,
  setTrackMuted,
  snapshotStudioProject,
} from "@/lib/studio/project";
import {
  acceptStudioSnapshot,
  createIndexedDbStudioSessionStore,
  createMemoryStudioSessionStore,
  restoreStudioProject,
  studioSessionRecord,
  type StudioSessionStore,
} from "@/lib/studio/session-store";
import type { StudioProject } from "@/lib/studio/types";

function take(result: { ok: true; project: StudioProject } | { ok: false }): StudioProject {
  if (!result.ok) throw new Error("edit failed");
  return result.project;
}

function sample() {
  let project = createStudioProject("Night take", "project-1");
  project = take(
    addImportedFileAsTrack(
      project,
      {
        id: "clip-1",
        fileName: "drums.wav",
        byteLength: 4,
        sourceDurationSec: 4,
        sampleRate: 44100,
        channels: 1,
        peaks: [0.2, 0.8],
      },
      "desktop",
    ),
  );
  const trackId = project.tracks[0]!.id;
  project = take(setClipOffset(project, trackId, "clip-1", 1.5));
  project = setMasterGain(project, -3);
  project = take(setTrackMuted(project, trackId, true));
  project.tracks[0]!.clips[0]!.buffer = { marker: "secret-pcm" } as unknown as AudioBuffer;
  const audio = new Map<string, ArrayBuffer>([["clip-1", Uint8Array.of(1, 2, 3, 4).buffer]]);
  return { project, audio };
}

async function roundTrip(store: StudioSessionStore) {
  const { project, audio } = sample();
  audio.set("gone", Uint8Array.of(9).buffer);
  await store.write(studioSessionRecord(project, audio));
  const loaded = await store.read();
  expect(loaded).not.toBeNull();
  if (!loaded) return;
  expect(loaded.snapshot.name).toBe("Night take");
  expect(loaded.snapshot.masterGainDb).toBe(-3);
  expect(loaded.snapshot.playheadSec).toBe(0);
  expect(loaded.snapshot.tracks[0]?.muted).toBe(true);
  expect(loaded.snapshot.tracks[0]?.clips[0]).toMatchObject({
    id: "clip-1",
    offsetSec: 1.5,
    trimEndSec: 4,
    peaks: [0.2, 0.8],
  });
  expect(JSON.stringify(loaded.snapshot)).not.toContain("secret-pcm");
  expect(loaded.audio.has("gone")).toBe(false);
  expect(new Uint8Array(loaded.audio.get("clip-1")!)).toEqual(Uint8Array.of(1, 2, 3, 4));

  const restored = await restoreStudioProject(loaded, async (data) => {
    return { marker: "decoded", bytes: data.byteLength } as unknown as AudioBuffer;
  });
  expect(restored?.project.tracks[0]?.clips[0]?.buffer).toMatchObject({ marker: "decoded", bytes: 4 });
  expect(restored?.project.tracks[0]?.clips[0]?.offsetSec).toBe(1.5);
  expect(JSON.stringify(snapshotStudioProject(restored!.project))).not.toContain("decoded");
  expect(new Uint8Array(restored!.audio.get("clip-1")!)).toEqual(Uint8Array.of(1, 2, 3, 4));

  const trimmed = take(setClipOffset(restored!.project, restored!.project.tracks[0]!.id, "clip-1", 2));
  const withoutClip = { ...trimmed, tracks: [] };
  await store.write(studioSessionRecord(withoutClip, restored!.audio));
  const clearedClip = await store.read();
  expect(clearedClip?.snapshot.tracks).toEqual([]);
  expect(clearedClip?.audio.size).toBe(0);

  await store.clear();
  expect(await store.read()).toBeNull();
}

describe("studio session store", () => {
  it("trims a project name and falls back when it is empty", () => {
    expect(finishedProjectName("  Night take  ")).toBe("Night take");
    expect(finishedProjectName("   ")).toBe("QVI Studio");
  });

  it("rejects a snapshot from another version", () => {
    const { project } = sample();
    const snapshot = snapshotStudioProject(project);
    expect(acceptStudioSnapshot({ ...snapshot, version: 2 })).toBeNull();
    expect(acceptStudioSnapshot(null)).toBeNull();
  });

  it("round-trips a project and its audio through a memory store", async () => {
    await roundTrip(createMemoryStudioSessionStore());
  });

  it("drops a snapshot whose version is not the current one", async () => {
    const store = createMemoryStudioSessionStore();
    const { project, audio } = sample();
    const snapshot = snapshotStudioProject(project);
    await store.write({ snapshot: { ...snapshot, version: 2 as 1 }, audio });
    expect(await store.read()).toBeNull();
  });

  it("round-trips a project and its audio through IndexedDB", async () => {
    await roundTrip(createIndexedDbStudioSessionStore(createFakeIndexedDB()));
  });

  it("restores a clip with no stored bytes as an empty buffer", async () => {
    const { project } = sample();
    const restored = await restoreStudioProject(studioSessionRecord(project, new Map()), async () => {
      throw new Error("should not decode");
    });
    expect(restored?.project.tracks[0]?.clips[0]?.buffer).toBeNull();
    expect(restored?.project.tracks[0]?.clips[0]?.fileName).toBe("drums.wav");
  });
});

class FakeTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  error: DOMException | null = null;
  private pending = 0;
  private finished = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly db: FakeDatabase,
    private readonly names: string[],
  ) {}

  objectStore(name: string): IDBObjectStore {
    if (!this.names.includes(name)) throw new Error(`missing store ${name}`);
    return this.db.storeApi(name, this);
  }

  track<T>(fill: (request: { result: T }) => void): IDBRequest<T> {
    this.pending += 1;
    const request = {
      result: undefined as T,
      error: null as DOMException | null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };
    queueMicrotask(() => {
      try {
        fill(request);
        this.pending -= 1;
        request.onsuccess?.(new Event("success"));
      } catch (error) {
        this.pending -= 1;
        request.error = error as DOMException;
        request.onerror?.(new Event("error"));
        this.onerror?.();
      }
      this.schedule();
    });
    return request as unknown as IDBRequest<T>;
  }

  private schedule() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.pending === 0 && !this.finished) {
        this.finished = true;
        this.oncomplete?.();
      }
    }, 0);
  }
}

class FakeDatabase {
  readonly stores = new Map<string, Map<string, unknown>>();
  readonly objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string) {
    this.stores.set(name, new Map());
  }

  transaction(names: string | string[]): IDBTransaction {
    const list = typeof names === "string" ? [names] : [...names];
    return new FakeTransaction(this, list) as unknown as IDBTransaction;
  }

  storeApi(name: string, tx: FakeTransaction): IDBObjectStore {
    const store = this.stores.get(name);
    if (!store) throw new Error(name);
    const api = {
      get: (key: IDBValidKey) =>
        tx.track((request) => {
          const value = store.get(String(key));
          request.result = value === undefined ? undefined : structuredClone(value);
        }),
      put: (value: unknown, key: IDBValidKey) =>
        tx.track((request) => {
          store.set(String(key), structuredClone(value));
          request.result = key;
        }),
      delete: (key: IDBValidKey) =>
        tx.track((request) => {
          store.delete(String(key));
          request.result = undefined;
        }),
      clear: () =>
        tx.track((request) => {
          store.clear();
          request.result = undefined;
        }),
      getAllKeys: () =>
        tx.track((request) => {
          const keys: string[] = [];
          store.forEach((_value, key) => keys.push(key));
          request.result = keys;
        }),
    };
    return api as unknown as IDBObjectStore;
  }
}

function createFakeIndexedDB(): IDBFactory {
  const databases = new Map<string, FakeDatabase>();
  const factory = {
    open(name: string) {
      const request = {
        result: undefined as FakeDatabase | undefined,
        error: null,
        onupgradeneeded: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
      };
      queueMicrotask(() => {
        let db = databases.get(name);
        if (!db) {
          db = new FakeDatabase();
          databases.set(name, db);
          request.result = db;
          request.onupgradeneeded?.(new Event("upgradeneeded"));
        }
        request.result = db;
        request.onsuccess?.(new Event("success"));
      });
      return request;
    },
  };
  return factory as unknown as IDBFactory;
}
