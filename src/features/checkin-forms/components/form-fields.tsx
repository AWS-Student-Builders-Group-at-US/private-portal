import type { FormField } from "../definition";

// Renders a check-in form definition in order. Shared by the public form and
// the panel preview. Checkboxes start unchecked unless the user ticked them.

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

const AUTOCOMPLETE: Record<string, string> = { name: "name", email: "email" };

type Props = {
  fields: FormField[];
  values?: Record<string, string>;
  errors?: Partial<Record<string, string[]>>;
  // Prefix for element ids, so a preview never clashes with a real form.
  idPrefix?: string;
};

export function FormFields({ fields, values = {}, errors = {}, idPrefix = "" }: Props) {
  // Keys include the index: while editing, the preview may hold duplicate keys.
  return fields.map((field, index) => {
    const id = `${idPrefix}${field.key}`;
    const fieldErrors = errors[field.key];
    const describedBy =
      [field.help && `${id}-help`, fieldErrors && `${id}-error`].filter(Boolean).join(" ") ||
      undefined;
    const help = field.help && (
      <p id={`${id}-help`} className="text-sm text-muted-foreground">
        {field.help}
      </p>
    );
    const errorList = fieldErrors?.map((error) => (
      <p key={error} id={`${id}-error`} className="text-sm text-destructive">
        {error}
      </p>
    ));

    if (field.type === "checkbox") {
      return (
        <div key={`${index}-${field.key}`} className="flex flex-col gap-1">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name={field.key}
              defaultChecked={values[field.key] === "on"}
              aria-describedby={describedBy}
              className="mt-0.5 size-5 shrink-0"
            />
            {field.label}
          </label>
          {help}
          {errorList}
        </div>
      );
    }

    const common = {
      id,
      name: field.key,
      required: field.required,
      defaultValue: values[field.key],
      "aria-invalid": Boolean(fieldErrors),
      "aria-describedby": describedBy,
      className: fieldClass,
    };
    return (
      <div key={`${index}-${field.key}`} className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {field.label}
          {!field.required && (
            <span className="font-normal text-muted-foreground"> (opcional)</span>
          )}
        </label>
        {field.type === "select" ? (
          <select {...common} defaultValue={values[field.key] ?? ""}>
            <option value="">Selecciona una opción</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...common}
            type={field.type === "email" ? "email" : "text"}
            inputMode={field.type === "email" ? "email" : undefined}
            autoComplete={AUTOCOMPLETE[field.key] ?? "off"}
            maxLength={field.type === "email" ? 254 : field.key === "name" ? 100 : 500}
          />
        )}
        {help}
        {errorList}
      </div>
    );
  });
}
