"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELETE_CONFIRM_KEYWORD } from "@/lib/admin/user-delete";

type AdminTypedConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  typeToConfirmLabel: string;
  /** User must type this exact string, or DELETE when allowDeleteKeyword is true. */
  expectedPhrase: string;
  allowDeleteKeyword?: boolean;
  busy?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminTypedConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  typeToConfirmLabel,
  expectedPhrase,
  allowDeleteKeyword = false,
  busy = false,
  errorMessage = null,
  onConfirm,
  onCancel,
}: AdminTypedConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTyped("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const normalized = typed.trim();
  const phraseMatch = normalized === expectedPhrase.trim();
  const deleteKeywordMatch = allowDeleteKeyword && normalized === DELETE_CONFIRM_KEYWORD;
  const canConfirm = phraseMatch || deleteKeywordMatch;

  return (
    <dialog
      ref={ref}
      className="max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 className="text-lg font-semibold text-destructive">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {errorMessage ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <Label htmlFor="admin-typed-confirm">{typeToConfirmLabel}</Label>
        <Input
          id="admin-typed-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          disabled={busy}
          dir="ltr"
        />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="button" variant="destructive" disabled={busy || !canConfirm} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}