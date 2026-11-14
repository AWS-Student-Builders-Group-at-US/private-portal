"use client";

import Link from "next/link";
import { ConfirmAction } from "@/features/checkin/components/attendance-controls";
import { activateCheckinForm } from "../actions";

export type VersionRow = {
  id: string;
  version: number;
  date: string;
  created_by: string;
  is_active: boolean;
};

export function VersionsList({ versions }: { versions: VersionRow[] }) {
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
              {row.is_active && (
                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Activa
                </span>
              )}
            </span>
            <span className="text-muted-foreground">
              {row.date} · {row.created_by} ·{" "}
              <Link
                href={`/privacidad?v=${row.version}`}
                className="underline underline-offset-4"
              >
                Ver política
              </Link>
            </span>
          </div>
          {!row.is_active && (
            <ConfirmAction
              label="Reactivar"
              question={`El formulario público pasará a ser la versión ${row.version}. ¿Continuar?`}
              confirmLabel="Sí, reactivar"
              action={() => activateCheckinForm(row.id)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
