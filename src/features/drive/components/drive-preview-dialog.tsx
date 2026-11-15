"use client";

import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { drivePreviewUrl } from "../preview";
import type { DriveItem } from "../types";

// Preview of one Drive file using Google's embeddable viewer. Base UI's
// Dialog provides the dialog role, focus trap, Esc to close and focus return.
// The viewer must have access to the file with their own Google account.
export function DrivePreviewDialog({
  item,
  onClose,
}: {
  item: DriveItem | null;
  onClose: () => void;
}) {
  const src = item ? drivePreviewUrl(item.id, item.mimeType) : null;

  return (
    <Dialog.Root
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-20 bg-black/40" />
        <Dialog.Popup className="fixed inset-2 z-30 flex flex-col gap-3 rounded-xl border bg-background p-4 md:inset-8">
          {item && (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <Dialog.Title className="truncate text-lg font-semibold">{item.name}</Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground">
                    Para ver la vista previa necesitas acceso al archivo con tu cuenta de Google.
                  </Dialog.Description>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.webViewLink && (
                    <a
                      href={item.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <ExternalLink /> Abrir en Drive
                    </a>
                  )}
                  <Dialog.Close
                    aria-label="Cerrar vista previa"
                    className={buttonVariants({ variant: "ghost", size: "icon" })}
                  >
                    <X />
                  </Dialog.Close>
                </div>
              </div>
              {src ? (
                <iframe
                  src={src}
                  title={`Vista previa de «${item.name}»`}
                  className="min-h-0 w-full flex-1 rounded-lg border bg-muted"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay vista previa disponible para este archivo.
                </p>
              )}
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
