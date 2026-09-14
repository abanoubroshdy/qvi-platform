export function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function parseClock(value: string, fallback = 0) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.max(0, Number(trimmed));
  }
  const parts = trimmed.split(":");
  if (parts.length === 2) {
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (Number.isFinite(minutes) && Number.isFinite(seconds)) {
      return Math.max(0, minutes * 60 + seconds);
    }
  }
  return fallback;
}

export function peaksFromBuffer(buffer: AudioBuffer, bars = 180) {
  const channel = buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(channel.length / bars));
  const peaks: number[] = [];
  for (let index = 0; index < bars; index += 1) {
    const start = index * block;
    let max = 0;
    for (let offset = 0; offset < block && start + offset < channel.length; offset += 1) {
      max = Math.max(max, Math.abs(channel[start + offset] ?? 0));
    }
    peaks.push(max);
  }
  return peaks;
}
