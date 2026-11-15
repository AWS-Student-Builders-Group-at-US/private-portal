import { describe, expect, it } from "vitest";
import { classifyDriveFailure } from "./errors";

const body = (reason: string, status = "PERMISSION_DENIED") =>
  JSON.stringify({ error: { code: 403, status, errors: [{ reason }], details: [{ reason }] } });

describe("classifyDriveFailure", () => {
  it("detects a disabled Drive API", () => {
    expect(classifyDriveFailure(403, body("accessNotConfigured"))).toEqual({ code: "api_disabled", reason: "accessNotConfigured" });
    expect(classifyDriveFailure(403, body("SERVICE_DISABLED"))).toEqual({ code: "api_disabled", reason: "SERVICE_DISABLED" });
  });
  it("treats other 401/403 as a permission problem", () => {
    expect(classifyDriveFailure(403, body("insufficientFilePermissions")).code).toBe("permission");
    expect(classifyDriveFailure(401, "").code).toBe("permission");
  });
  it("maps 404 to not_found and other statuses to unknown", () => {
    expect(classifyDriveFailure(404, body("notFound")).code).toBe("not_found");
    expect(classifyDriveFailure(500, "oops").code).toBe("unknown");
  });
  it("survives non-JSON bodies", () => {
    expect(classifyDriveFailure(403, "<html>")).toEqual({ code: "permission", reason: null });
  });
});
