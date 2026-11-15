"use client";

import Link from "next/link";
import { ConfirmAction } from "@/features/checkin/components/attendance-controls";
import { restoreCheckinFormVersion } from "../actions";

export type VersionRow = {
  id: string;
  form_id: string;
  version: number;
  date: string;
  created_by: string;
  // The form's newest version: the one its events use.
  is_current: boolean;
};

export function VersionsList({
  versions,
  canRestore = true,
}: {
  versions: VersionRow[];
  canRestore?: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {versions.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col text-sm">
            <span className="font-medium">
              Versión {row.version}
              {row.is_current && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  En uso
                </span>
              )}
            </span>
            <span className="text-muted-foreground">
              {row.date} · {row.created_by} ·{" "}
              <Link
                href={`/privacidad?f=${row.form_id}&v=${row.version}`}
                className="underline underline-offset-4"
              >
                Ver política
              </Link>
            </span>
          </div>
          {!row.is_current && canRestore && (
            <ConfirmAction
              label="Restaurar"
              question={`Se publicará una copia de la versión ${row.version} como versión nueva de este formulario. ¿Continuar?`}
              confirmLabel="Sí, restaurar"
              action={() => restoreCheckinFormVersion(row.id)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
