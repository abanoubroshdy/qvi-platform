/**
 * On-device session store for QVI Studio.
 * The snapshot has no PCM. Audio bytes live beside it so refresh can decode buffers again.
 * Cloud sync is out of scope.
 */

import { projectFromSnapshot, snapshotStudioProject } from "@/lib/studio/project";
import { STUDIO_SNAPSHOT_VERSION, type StudioProject, type StudioProjectSnapshot } from "@/lib/studio/types";

export const STUDIO_SESSION_DB = "qvi-studio";
export const STUDIO_SESSION_DB_VERSION = 1;
export const STUDIO_SESSION_SAVE_MS = 500;

const SNAPSHOT_STORE = "snapshot";
const AUDIO_STORE = "audio";
const SNAPSHOT_KEY = "current";

export type StudioSessionAudio = Map<string, ArrayBuffer>;

export type StoredStudioSession = {
  snapshot: StudioProjectSnapshot;
  audio: StudioSessionAudio;
};

export type StudioSessionStore = {
  read(): Promise<StoredStudioSession | null>;
  write(session: StoredStudioSession): Promise<void>;
  clear(): Promise<void>;
};

export function studioClipIds(snapshot: StudioProjectSnapshot): string[] {
  const ids: string[] = [];
  for (const track of snapshot.tracks ?? []) {
    for (const clip of track.clips ?? []) ids.push(clip.id);
  }
  return ids;
}

export function acceptStudioSnapshot(value: unknown): StudioProjectSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as StudioProjectSnapshot;
  if (snapshot.version !== STUDIO_SNAPSHOT_VERSION) return null;
  if (typeof snapshot.id !== "string" || typeof snapshot.name !== "string") return null;
  if (!Array.isArray(snapshot.tracks)) return null;
  return snapshot;
}

/** Bytes kept for clips that are still in the snapshot. Each entry is a copy. */
export function sessionAudioForSnapshot(snapshot: StudioProjectSnapshot, audio: StudioSessionAudio): StudioSessionAudio {
  const next: StudioSessionAudio = new Map();
  for (const id of studioClipIds(snapshot)) {
    const bytes = audio.get(id);
    if (bytes && bytes.byteLength > 0) next.set(id, bytes.slice(0));
  }
  return next;
}

export function createMemoryStudioSessionStore(): StudioSessionStore {
  let snapshot: StudioProjectSnapshot | null = null;
  let audio: StudioSessionAudio = new Map();
  return {
    async read() {
      if (!snapshot) return null;
      const accepted = acceptStudioSnapshot(snapshot);
      if (!accepted) return null;
      return { snapshot: structuredClone(accepted), audio: sessionAudioForSnapshot(accepted, audio) };
    },
    async write(session) {
      const accepted = acceptStudioSnapshot(session.snapshot);
      if (!accepted) {
        snapshot = null;
        audio = new Map();
        return;
      }
      snapshot = structuredClone(accepted);
      audio = sessionAudioForSnapshot(accepted, session.audio);
    },
    async clear() {
      snapshot = null;
      audio = new Map();
    },
  };
}

export function createIndexedDbStudioSessionStore(factory: IDBFactory): StudioSessionStore {
  let opening: Promise<IDBDatabase> | null = null;
  const database = () => {
    if (!opening) {
      opening = openStudioSessionDb(factory).catch((error) => {
        opening = null;
        throw error;
      });
    }
    return opening;
  };
  return {
    async read() {
      const db = await database();
      const rawSnapshot = await requestToPromise(
        db.transaction(SNAPSHOT_STORE, "readonly").objectStore(SNAPSHOT_STORE).get(SNAPSHOT_KEY),
      );
      const snapshot = acceptStudioSnapshot(rawSnapshot);
      if (!snapshot) return null;
      const ids = studioClipIds(snapshot);
      const audio: StudioSessionAudio = new Map();
      if (ids.length === 0) return { snapshot, audio };
      const tx = db.transaction(AUDIO_STORE, "readonly");
      const done = transactionDone(tx);
      const store = tx.objectStore(AUDIO_STORE);
      await Promise.all(
        ids.map((id) =>
          requestToPromise(store.get(id)).then((value) => {
            const bytes = toArrayBuffer(value);
            if (bytes && bytes.byteLength > 0) audio.set(id, bytes);
          }),
        ),
      );
      await done;
      return { snapshot, audio };
    },
    async write(session) {
      const snapshot = acceptStudioSnapshot(session.snapshot);
      const db = await database();
      const audio = snapshot ? sessionAudioForSnapshot(snapshot, session.audio) : new Map();
      const keys = await requestToPromise(db.transaction(AUDIO_STORE, "readonly").objectStore(AUDIO_STORE).getAllKeys());
      const tx = db.transaction([SNAPSHOT_STORE, AUDIO_STORE], "readwrite");
      const done = transactionDone(tx);
      const audioStore = tx.objectStore(AUDIO_STORE);
      if (!snapshot) {
        tx.objectStore(SNAPSHOT_STORE).delete(SNAPSHOT_KEY);
        audioStore.clear();
        await done;
        return;
      }
      const keep = new Set<string>();
      audio.forEach((_, id) => keep.add(id));
      tx.objectStore(SNAPSHOT_STORE).put(snapshot, SNAPSHOT_KEY);
      for (const key of keys) {
        if (!keep.has(String(key))) audioStore.delete(key);
      }
      audio.forEach((bytes, id) => {
        audioStore.put(bytes, id);
      });
      await done;
    },
    async clear() {
      const db = await database();
      const tx = db.transaction([SNAPSHOT_STORE, AUDIO_STORE], "readwrite");
      const done = transactionDone(tx);
      tx.objectStore(SNAPSHOT_STORE).clear();
      tx.objectStore(AUDIO_STORE).clear();
      await done;
    },
  };
}

let browserStore: StudioSessionStore | null = null;

export function browserStudioSessionStore(): StudioSessionStore {
  if (!browserStore) {
    if (typeof indexedDB === "undefined") browserStore = createMemoryStudioSessionStore();
    else browserStore = createIndexedDbStudioSessionStore(indexedDB);
  }
  return browserStore;
}

export async function restoreStudioProject(
  stored: StoredStudioSession,
  decode: (data: ArrayBuffer) => Promise<AudioBuffer>,
): Promise<{ project: StudioProject; audio: StudioSessionAudio } | null> {
  const snapshot = acceptStudioSnapshot(stored.snapshot);
  if (!snapshot) return null;
  const audio = sessionAudioForSnapshot(snapshot, stored.audio);
  const buffers = new Map<string, AudioBuffer | null>();
  for (const id of studioClipIds(snapshot)) {
    const bytes = audio.get(id);
    if (!bytes) {
      buffers.set(id, null);
      continue;
    }
    try {
      buffers.set(id, await decode(bytes.slice(0)));
    } catch {
      buffers.set(id, null);
    }
  }
  return { project: projectFromSnapshot(snapshot, buffers), audio };
}

export function studioSessionRecord(project: StudioProject, audio: StudioSessionAudio): StoredStudioSession {
  return {
    snapshot: snapshotStudioProject(project),
    audio,
  };
}

function openStudioSessionDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(STUDIO_SESSION_DB, STUDIO_SESSION_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) db.createObjectStore(SNAPSHOT_STORE);
      if (!db.objectStoreNames.contains(AUDIO_STORE)) db.createObjectStore(AUDIO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the studio session store"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Studio session request failed"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Studio session transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("Studio session transaction failed"));
  });
}

function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) return value.slice(0) as ArrayBuffer;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }
  return null;
}
