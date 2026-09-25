"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/components/i18n/I18nProvider";
import {
  codecsFor,
  defaultCodec,
  defaultCrf,
  videoBitrates,
  videoContainers,
  videoFrameRates,
  videoScales,
  type VideoConvertSettings as Settings,
  type VideoContainer,
} from "@/lib/video-convert";

type Props = {
  settings: Settings;
  disabled?: boolean;
  onChange: (next: Settings) => void;
};

export function VideoConvertSettings({ settings, disabled, onChange }: Props) {
  const { copy } = useI18n();
  const t = copy.videoConverter;
  const codecs = codecsFor(settings.container);
  const remux = settings.mode === "remux";

  function setContainer(container: VideoContainer) {
    const codec = codecsFor(container).includes(settings.codec) ? settings.codec : defaultCodec(container);
    onChange({
      ...settings,
      container,
      codec,
      crf: codecsFor(container).includes(settings.codec) ? settings.crf : defaultCrf(codec),
      mode: container === "gif" ? "transcode" : settings.mode,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-start">{t.container}</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.container}>
          {videoContainers.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={settings.container === item ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={settings.container === item}
              dir="ltr"
              onClick={() => setContainer(item)}
            >
              {t.containers[item]}
            </Button>
          ))}
        </div>
      </div>

      {codecs.length > 1 ? (
        <div className="space-y-2">
          <Label className="text-start">{t.codec}</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.codec}>
            {codecs.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={settings.codec === item ? "default" : "outline"}
                disabled={disabled || remux}
                aria-pressed={settings.codec === item}
                dir="ltr"
                onClick={() => onChange({ ...settings, codec: item, crf: defaultCrf(item) })}
              >
                {t.codecs[item]}
              </Button>
            ))}
          </div>
        </div>
      ) : codecs.length === 1 ? (
        <p className="text-sm text-muted-foreground" dir="ltr">
          {t.codec}: {t.codecs[codecs[0]]}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t.gifHint}</p>
      )}

      <div className="space-y-2">
        <Label className="text-start">{t.mode}</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.mode}>
          <Button
            type="button"
            size="sm"
            variant={settings.mode === "transcode" ? "default" : "outline"}
            disabled={disabled}
            aria-pressed={settings.mode === "transcode"}
            onClick={() => onChange({ ...settings, mode: "transcode" })}
          >
            {t.transcode}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={settings.mode === "remux" ? "default" : "outline"}
            disabled={disabled || settings.container === "gif"}
            aria-pressed={settings.mode === "remux"}
            onClick={() => onChange({ ...settings, mode: "remux" })}
          >
            {t.remux}
          </Button>
        </div>
        <p className="text-start text-xs text-muted-foreground">{remux ? t.remuxHint : t.transcodeHint}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-start">{t.audio}</Label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.audio}>
          <Button
            type="button"
            size="sm"
            variant={settings.audio === "keep" ? "default" : "outline"}
            disabled={disabled || settings.container === "gif"}
            aria-pressed={settings.audio === "keep"}
            onClick={() => onChange({ ...settings, audio: "keep" })}
          >
            {t.keepAudio}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={settings.audio === "remove" ? "default" : "outline"}
            disabled={disabled || settings.container === "gif"}
            aria-pressed={settings.audio === "remove"}
            onClick={() => onChange({ ...settings, audio: "remove" })}
          >
            {t.removeAudio}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-start">{t.scale}</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.scale}>
            {videoScales.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={settings.scale === item ? "default" : "outline"}
                disabled={disabled || remux}
                aria-pressed={settings.scale === item}
                dir="ltr"
                onClick={() => onChange({ ...settings, scale: item })}
              >
                {t.scales[item]}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-start">{t.fps}</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.fps}>
            {videoFrameRates.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={settings.fps === item ? "default" : "outline"}
                disabled={disabled || remux}
                aria-pressed={settings.fps === item}
                dir="ltr"
                onClick={() => onChange({ ...settings, fps: item })}
              >
                {t.frameRates[item]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {settings.container === "gif" || remux ? null : (
        <div className="space-y-3">
          <Label className="text-start">{t.qualityMode}</Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.qualityMode}>
            <Button
              type="button"
              size="sm"
              variant={settings.qualityMode === "crf" ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={settings.qualityMode === "crf"}
              onClick={() => onChange({ ...settings, qualityMode: "crf" })}
            >
              {t.crf}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={settings.qualityMode === "bitrate" ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={settings.qualityMode === "bitrate"}
              onClick={() => onChange({ ...settings, qualityMode: "bitrate" })}
            >
              {t.bitrate}
            </Button>
          </div>
          {settings.qualityMode === "crf" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{t.crfValue}</span>
                <span className="text-sm font-semibold tabular-nums text-primary" dir="ltr">
                  {settings.crf}
                </span>
              </div>
              <div dir="ltr">
                <Slider
                  min={18}
                  max={40}
                  step={1}
                  value={[settings.crf]}
                  disabled={disabled}
                  onValueChange={(value) => onChange({ ...settings, crf: value[0] ?? settings.crf })}
                  aria-label={t.crf}
                />
              </div>
              <p className="text-start text-xs text-muted-foreground">{t.crfHint}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.bitrate}>
              {videoBitrates.map((rate) => (
                <Button
                  key={rate}
                  type="button"
                  size="sm"
                  variant={settings.videoBitrate === rate ? "default" : "outline"}
                  disabled={disabled}
                  aria-pressed={settings.videoBitrate === rate}
                  dir="ltr"
                  onClick={() => onChange({ ...settings, videoBitrate: rate })}
                >
                  {rate >= 1000 ? `${rate / 1000} Mbps` : `${rate} kbps`}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
