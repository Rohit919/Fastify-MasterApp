import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input, type InputProps } from "@/components/ui/input";
import { FieldError } from "@/components/forms/form-field";
import { cn } from "@/lib/utils";

interface InputFieldProps extends InputProps {
  label: string;
  error?: string;
  /** Leading icon rendered inside the input. */
  icon?: LucideIcon;
  /** Optional trailing control (e.g. a password show/hide toggle). */
  trailing?: React.ReactNode;
}

/**
 * A polished labeled input with an optional leading icon and trailing
 * adornment. Forwards the ref for react-hook-form `register`. Used by the auth
 * pages for a more premium field treatment; falls back gracefully without an
 * icon.
 */
export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, icon: Icon, trailing, id, className, ...props }, ref) => {
    const fieldId = id ?? props.name ?? label;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldId} className="text-foreground/80">
          {label}
        </Label>
        <div className="relative">
          {Icon && (
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            id={fieldId}
            ref={ref}
            aria-invalid={!!error}
            className={cn(
              "h-11 bg-background/60",
              Icon && "pl-10",
              trailing && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            {...props}
          />
          {trailing && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              {trailing}
            </div>
          )}
        </div>
        <FieldError message={error} />
      </div>
    );
  },
);
InputField.displayName = "InputField";
