"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/ToolLayout";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

function encodeText(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeText(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function Base64Tool() {
  const { copy } = useI18n();
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    try {
      if (mode === "encode") {
        setOutput(encodeText(input));
      } else {
        setOutput(decodeText(input));
      }
    } catch {
      setOutput("");
      setError(mode === "encode" ? copy.base64.failedEncode : copy.base64.failedDecode);
    }
  }

  function onFile(files: File[]) {
    const file = files[0];
    if (!file) return;
    setMode("encode");
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setInput(result);
      setOutput(result);
    };
    reader.onerror = () => setError(copy.base64.failedFile);
    reader.readAsDataURL(file);
  }

  return (
    <ToolLayout
      hideDropzone
      emptyPreviewText={copy.base64.empty}
      actionLabel={mode === "encode" ? copy.base64.actionEncode : copy.base64.actionDecode}
      onAction={run}
      actionDisabled={!input.trim()}
      downloadLabel={copy.base64.download}
      onDownload={() => output && void copyText(output)}
      downloadDisabled={!output}
      error={error}
      onFiles={onFile}
      leading={
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["encode", "decode"] as const).map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={mode === item ? "default" : "ghost"}
                className={cn("min-w-24", mode === item && "shadow")}
                onClick={() => {
                  setMode(item);
                  setError(null);
                  setOutput("");
                }}
              >
                {item === "encode" ? copy.base64.encode : copy.base64.decode}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="base64-input">{copy.base64.input}</Label>
            <textarea
              id="base64-input"
              rows={7}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === "encode" ? copy.base64.placeholderEncode : copy.base64.placeholderDecode}
              className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
              dir="auto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base64-file">{copy.base64.file}</Label>
            <input
              id="base64-file"
              type="file"
              className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(event) => {
                if (event.target.files?.length) onFile(Array.from(event.target.files));
                event.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">{copy.base64.fileHint}</p>
          </div>
        </div>
      }
      preview={
        output ? (
          <div className="space-y-2">
            <Label htmlFor="base64-output">{copy.base64.output}</Label>
            <textarea
              id="base64-output"
              readOnly
              rows={8}
              value={output}
              className="flex min-h-[160px] w-full rounded-md border border-input bg-muted/40 px-3 py-2 font-mono text-sm"
              dir="ltr"
            />
          </div>
        ) : undefined
      }
    />
  );
}
