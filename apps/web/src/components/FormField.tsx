import { forwardRef, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, id, ...inputProps },
  ref,
) {
  const fieldId = id ?? inputProps.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className={`rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 ${
          error ? "border-red-400" : "border-border"
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});
