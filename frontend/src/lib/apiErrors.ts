// lib/apiErrors.ts

export class ApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type ApiErrorPayload = { detail?: unknown } & Record<string, unknown>;

export function parseApiError(res: Response, detail: unknown): ApiError {
  const status = res.status;

  // Cas auth
  if (status === 401) {
    return new ApiError("Non autorisé.", status, detail);
  }

  if (status === 403) {
    return new ApiError("Accès refusé.", status, detail);
  }

  // Validation Pydantic (422)
  if (status === 422) {
    return new ApiError("Données invalides.", status, detail);
  }

  // FastAPI HTTPException standard
  if (detail && typeof detail === "object" && "detail" in detail) {
    const d = (detail as ApiErrorPayload).detail;
    if (typeof d === "string") {
      return new ApiError(d, status, detail);
    }
  }

  return new ApiError("Erreur serveur.", status, detail);
}
