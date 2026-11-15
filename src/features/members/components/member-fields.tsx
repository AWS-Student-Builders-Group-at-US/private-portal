import { MEMBER_AREAS, MEMBER_AREA_LABELS } from "../schema";

export const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function FieldErrors({ id, errors }: { id: string; errors?: string[] }) {
  return errors?.map((error) => (
    <p key={error} id={id} className="text-xs text-destructive">
      {error}
    </p>
  ));
}

// Name and area inputs shared by the add and edit forms.
export function NameAndAreaFields({
  idPrefix,
  values,
  fieldErrors,
}: {
  idPrefix: string;
  values?: Record<string, string>;
  fieldErrors?: Partial<Record<string, string[]>>;
}) {
  const nameErrors = fieldErrors?.name;
  const areaErrors = fieldErrors?.area;
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
          Nombre
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          maxLength={80}
          defaultValue={values?.name ?? ""}
          aria-invalid={!!nameErrors}
          aria-describedby={nameErrors ? `${idPrefix}-name-error` : undefined}
          className={fieldClass}
        />
        <FieldErrors id={`${idPrefix}-name-error`} errors={nameErrors} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-area`} className="text-sm font-medium">
          Área
        </label>
        <select
          id={`${idPrefix}-area`}
          name="area"
          defaultValue={values?.area ?? ""}
          aria-invalid={!!areaErrors}
          aria-describedby={areaErrors ? `${idPrefix}-area-error` : undefined}
          className={fieldClass}
        >
          <option value="" disabled>
            Elige un área
          </option>
          {MEMBER_AREAS.map((area) => (
            <option key={area} value={area}>
              {MEMBER_AREA_LABELS[area]}
            </option>
          ))}
        </select>
        <FieldErrors id={`${idPrefix}-area-error`} errors={areaErrors} />
      </div>
    </>
  );
}
