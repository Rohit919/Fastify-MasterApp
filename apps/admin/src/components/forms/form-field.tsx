import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Reusable labeled field with validation error display. Works with any input
 * by wrapping arbitrary children, or renders a plain <Input> for the common
 * case. Error messages are i18n keys (from the zod schemas) resolved here.
 */
export function FieldError({ message }: { message?: string }) {
  const { t } = useTranslation();
  if (!message) return null;
  // Schema messages are i18n keys like "validation:email"; fall back to raw.
  const text = message.includes(':') ? t(message) : message;
  return (
    <p className="mt-1.5 text-sm text-destructive" role="alert">
      {text}
    </p>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

interface TextFieldProps extends InputProps {
  label: string;
  error?: string;
}

/** Convenience: labeled <Input> + error, forwarding the ref for RHF register. */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const fieldId = id ?? props.name ?? label;
    return (
      <FormField label={label} htmlFor={fieldId} error={error}>
        <Input id={fieldId} ref={ref} aria-invalid={!!error} {...props} />
      </FormField>
    );
  }
);
TextField.displayName = 'TextField';
