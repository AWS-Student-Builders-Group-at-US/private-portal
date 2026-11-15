import type { DriveErrorCode } from "./types";

// Spanish copy for Drive error states (shared by Recursos and Ajustes).
export function driveErrorMessage(
  code: DriveErrorCode,
  serviceAccountEmail: string | null,
): { title: string; detail: string } {
  switch (code) {
    case "config":
      return {
        title: "Falta configurar la carpeta de Drive",
        detail:
          "Define GOOGLE_SERVICE_ACCOUNT_KEY en el servidor (Vercel) y elige la carpeta en Ajustes o con GOOGLE_DRIVE_FOLDER_ID. Los pasos están en el README.",
      };
    case "permission":
    case "not_found":
      return {
        title: "La carpeta no está compartida con la cuenta de servicio",
        detail: serviceAccountEmail
          ? `Pide a la persona propietaria que comparta la carpeta con ${serviceAccountEmail} como Lector.`
          : "Pide a la persona propietaria que comparta la carpeta con la cuenta de servicio como Lector.",
      };
    case "timeout":
      return {
        title: "Google Drive no respondió a tiempo",
        detail: "Inténtalo de nuevo en unos minutos con «Actualizar».",
      };
    default:
      return {
        title: "No se pudo cargar la carpeta de Drive",
        detail: "Inténtalo de nuevo en unos minutos con «Actualizar».",
      };
  }
}
