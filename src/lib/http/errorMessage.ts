type ApiErrorShape = {
  response?: {
    data?: {
      message?: unknown;
    };
  };
};

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;

  const message = (error as ApiErrorShape).response?.data?.message;
  return typeof message === "string" && message ? message : fallback;
}
