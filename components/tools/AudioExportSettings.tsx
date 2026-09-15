"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  aacBitrates,
  mp3Bitrates,
  sampleRatesFor,
  type AudioExportFormat,
  type AudioExportSettings,
} from "@/lib/audio-export";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/components/i18n/I18nProvider";

type Props = {
  format: AudioExportFormat;
  settings: AudioExportSettings;
  disabled?: boolean;
  onChange: (next: AudioExportSettings) => void;
};

function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-start">{label}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export function AudioExportSettingsPanel({ format, settings, disabled, onChange }: Props) {
  const { copy } = useI18n();
  const t = copy.mp4ToMp3;
  const rates = sampleRatesFor(format);
  const bitrates = format === "m4a" ? aacBitrates : mp3Bitrates;
  const showBitrate = format === "m4a" || (format === "mp3" && settings.mp3Mode === "cbr");
  const showMp3Quality = format === "mp3" && settings.mp3Mode === "vbr";
  const showOggQuality = format === "ogg";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ChoiceRow label={t.sampleRate}>
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
      </ChoiceRow>

      <ChoiceRow label={t.channels}>
        <Button type="button" size="sm" variant={settings.channels === 1 ? "default" : "outline"} disabled={disabled} aria-pressed={settings.channels === 1} onClick={() => onChange({ ...settings, channels: 1 })}>
          {t.mono}
        </Button>
        <Button type="button" size="sm" variant={settings.channels === 2 ? "default" : "outline"} disabled={disabled} aria-pressed={settings.channels === 2} onClick={() => onChange({ ...settings, channels: 2 })}>
          {t.stereo}
        </Button>
      </ChoiceRow>

      {format === "mp3" ? (
        <ChoiceRow label={t.mp3Mode}>
          <Button type="button" size="sm" variant={settings.mp3Mode === "cbr" ? "default" : "outline"} disabled={disabled} aria-pressed={settings.mp3Mode === "cbr"} onClick={() => onChange({ ...settings, mp3Mode: "cbr" })}>
            {t.cbr}
          </Button>
          <Button type="button" size="sm" variant={settings.mp3Mode === "vbr" ? "default" : "outline"} disabled={disabled} aria-pressed={settings.mp3Mode === "vbr"} onClick={() => onChange({ ...settings, mp3Mode: "vbr" })}>
            {t.vbr}
          </Button>
        </ChoiceRow>
      ) : null}

      {showBitrate ? (
        <ChoiceRow label={t.bitrate}>
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
        </ChoiceRow>
      ) : null}

      {format === "wav" ? (
        <ChoiceRow label={t.bitDepth}>
          <Button type="button" size="sm" variant={settings.wavBitDepth === 16 ? "default" : "outline"} disabled={disabled} aria-pressed={settings.wavBitDepth === 16} onClick={() => onChange({ ...settings, wavBitDepth: 16 })}>
            {t.bit16}
          </Button>
          <Button type="button" size="sm" variant={settings.wavBitDepth === 24 ? "default" : "outline"} disabled={disabled} aria-pressed={settings.wavBitDepth === 24} onClick={() => onChange({ ...settings, wavBitDepth: 24 })}>
            {t.bit24}
          </Button>
        </ChoiceRow>
      ) : null}

      {showMp3Quality ? (
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mp3-quality" className="text-start">
              {t.quality}
            </Label>
            <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
              {settings.vbrQuality}
            </span>
          </div>
          <div dir="ltr">
            <Slider id="mp3-quality" min={0} max={9} step={1} value={[settings.vbrQuality]} disabled={disabled} onValueChange={(value) => onChange({ ...settings, vbrQuality: value[0] ?? 2 })} aria-label={t.quality} />
          </div>
          <p className="text-start text-xs text-muted-foreground">{t.qualityHintMp3}</p>
        </div>
      ) : null}

      {showOggQuality ? (
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="ogg-quality" className="text-start">
              {t.quality}
            </Label>
            <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
              {settings.vbrQuality}
            </span>
          </div>
          <div dir="ltr">
            <Slider id="ogg-quality" min={0} max={10} step={1} value={[settings.vbrQuality]} disabled={disabled} onValueChange={(value) => onChange({ ...settings, vbrQuality: value[0] ?? 5 })} aria-label={t.quality} />
          </div>
          <p className="text-start text-xs text-muted-foreground">{t.qualityHintOgg}</p>
        </div>
      ) : null}

      {format === "flac" ? (
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="flac-level" className="text-start">
              {t.flacLevel}
            </Label>
            <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
              {settings.flacLevel}
            </span>
          </div>
          <div dir="ltr">
            <Slider id="flac-level" min={0} max={12} step={1} value={[settings.flacLevel]} disabled={disabled} onValueChange={(value) => onChange({ ...settings, flacLevel: value[0] ?? 5 })} aria-label={t.flacLevel} />
          </div>
          <p className="text-start text-xs text-muted-foreground">{t.flacHint}</p>
        </div>
      ) : null}
    </div>
  );
}
