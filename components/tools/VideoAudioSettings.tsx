"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AudioExportSettingsPanel } from "@/components/tools/AudioExportSettings";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { AudioExportSettings } from "@/lib/audio-export";
import { interpolate } from "@/lib/i18n";
import {
  isLegacyAudioFormat,
  videoAudioBitrates,
  videoAudioSampleRates,
  type VideoAudioFormat,
} from "@/lib/video-audio";

type Props = {
  format: VideoAudioFormat;
  settings: AudioExportSettings;
  disabled?: boolean;
  onChange: (next: AudioExportSettings) => void;
};

export function VideoAudioSettings({ format, settings, disabled, onChange }: Props) {
  const { copy } = useI18n();
  const t = copy.mp4ToMp3;

  if (isLegacyAudioFormat(format)) {
    return <AudioExportSettingsPanel format={format} settings={settings} disabled={disabled} onChange={onChange} />;
  }

  const rates = videoAudioSampleRates(format);
  const bitrates = videoAudioBitrates(format);
  const showBitrate = format === "aac" || format === "opus" || format === "wma";
  const showDepth = format === "aiff";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label className="text-start">{t.sampleRate}</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.sampleRate}>
          {rates.map((rate) => (
            <Button
              key={rate}
              type="button"
              size="sm"
              variant={settings.sampleRate === rate ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={settings.sampleRate === rate}
              dir="ltr"
              onClick={() => onChange({ ...settings, sampleRate: rate })}
            >
              {interpolate(t.hz, { value: rate.toLocaleString("en-US") })}
            </Button>
          ))}
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        <Label className="text-start">{t.channels}</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.channels}>
          <Button
            type="button"
            size="sm"
            variant={settings.channels === 1 ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={settings.channels === 1}
            onClick={() => onChange({ ...settings, channels: 1 })}
          >
            {t.mono}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={settings.channels === 2 ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={settings.channels === 2}
            onClick={() => onChange({ ...settings, channels: 2 })}
          >
            {t.stereo}
          </Button>
        </div>
      </div>
      {showBitrate ? (
        <div className="min-w-0 space-y-2 sm:col-span-2">
          <Label className="text-start">{t.bitrate}</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.bitrate}>
            {bitrates.map((rate) => (
              <Button
                key={rate}
                type="button"
                size="sm"
                variant={settings.bitrate === rate ? "default" : "outline"}
                disabled={disabled}
                aria-pressed={settings.bitrate === rate}
                dir="ltr"
                onClick={() => onChange({ ...settings, bitrate: rate })}
              >
                {interpolate(t.kbps, { value: rate })}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {showDepth ? (
        <div className="min-w-0 space-y-2">
          <Label className="text-start">{t.bitDepth}</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.bitDepth}>
            <Button
              type="button"
              size="sm"
              variant={settings.wavBitDepth === 16 ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={settings.wavBitDepth === 16}
              onClick={() => onChange({ ...settings, wavBitDepth: 16 })}
            >
              {t.bit16}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={settings.wavBitDepth === 24 ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={settings.wavBitDepth === 24}
              onClick={() => onChange({ ...settings, wavBitDepth: 24 })}
            >
              {t.bit24}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
