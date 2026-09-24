"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveStretchParams } from "@/lib/audio-stretch-live";
import { createLiveStretchVoice, enableLiveStretch } from "@/lib/audio-stretch-worklet";

/**
 * Plays one decoded buffer through the SoundTouch worklet.
 * Slider changes update AudioParams on the main thread while it is running.
 */
export function useLiveStretchPreview(buffer: AudioBuffer | null) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const paramsRef = useRef<LiveStretchParams | null>(null);
  const graphRef = useRef<{ voice: ReturnType<typeof createLiveStretchVoice>; source: AudioBufferSourceNode } | null>(null);

  const stop = useCallback(() => {
    const graph = graphRef.current;
    graphRef.current = null;
    if (graph) {
      graph.source.onended = null;
      try {
        graph.source.stop();
      } catch {
        /* already stopped */
      }
      try {
        graph.source.disconnect();
      } catch {
        /* already disconnected */
      }
      try {
        graph.voice.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    setPlaying(false);
  }, []);

  useEffect(() => {
    const context = new AudioContext();
    contextRef.current = context;
    let cancelled = false;
    void enableLiveStretch(context).then((ok) => {
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
      stop();
      contextRef.current = null;
      void context.close().catch(() => undefined);
    };
  }, [stop]);

  useEffect(() => {
    stop();
  }, [buffer, stop]);

  const apply = useCallback((params: LiveStretchParams) => {
    paramsRef.current = params;
    const graph = graphRef.current;
    if (!graph) return;
    graph.voice.apply(params, graph.source.playbackRate);
  }, []);

  const play = useCallback(async () => {
    const context = contextRef.current;
    const params = paramsRef.current;
    if (!context || !buffer || !params || !ready) return;
    stop();
    await context.resume();
    const voice = createLiveStretchVoice(context);
    const source = context.createBufferSource();
    source.buffer = buffer;
    voice.apply(params, source.playbackRate);
    source.connect(voice.input);
    voice.connect(context.destination);
    source.onended = () => {
      if (graphRef.current?.source !== source) return;
      graphRef.current = null;
      setPlaying(false);
    };
    graphRef.current = { voice, source };
    source.start();
    setPlaying(true);
  }, [buffer, ready, stop]);

  return { ready, playing, play, stop, apply };
}
