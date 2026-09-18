"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n/I18nProvider";
import { passwordStrength, type PasswordStrength } from "@/lib/auth/profile";
import { cn } from "@/lib/utils";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
  showStrength?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

const strengthClass: Record<Exclude<PasswordStrength, "empty">, string> = {
  weak: "bg-destructive w-1/3",
  medium: "bg-amber-400 w-2/3",
  strong: "bg-emerald-400 w-full",
};

export function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  error,
  showStrength = false,
  onChange,
  onBlur,
}: PasswordFieldProps) {
  const { copy } = useI18n();
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);
  const a = copy.auth;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
        <span className="ms-1 text-destructive" aria-hidden>
          *
        </span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          placeholder={placeholder}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 bg-background pe-11 text-foreground placeholder:text-muted-foreground/80"
        />
        <button
          type="button"
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? a.hidePassword : a.showPassword}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {showStrength && strength !== "empty" ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all", strengthClass[strength])} />
          </div>
          <p className="text-xs text-muted-foreground">{a.passwordStrength[strength]}</p>
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
