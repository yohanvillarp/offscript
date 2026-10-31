type DraftFieldProps = Readonly<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "url";
  required?: boolean;
}>;

export function DraftField({ id, label, value, onChange, error, hint, placeholder, multiline, type = "text", required = true }: DraftFieldProps) {
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const className = `w-full rounded-md border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted ${error ? "border-danger" : "border-separator"}`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">{label}{!required && <span className="ml-2 font-normal text-muted">Optional</span>}</label>
      {multiline ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={description} className={`${className} resize-y`} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-required={required} aria-invalid={Boolean(error)} aria-describedby={description} className={`${className} ${type === "url" ? "font-mono" : ""}`} autoComplete="off" />
      )}
      {hint && <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}
