type NamedError = {
  name?: unknown;
  fields?: unknown;
};

function errorShape(error: unknown): NamedError | null {
  return typeof error === "object" && error !== null
    ? (error as NamedError)
    : null;
}

export function hasErrorName(error: unknown, expectedName: string) {
  return errorShape(error)?.name === expectedName;
}

export function getErrorFieldNames(error: unknown) {
  const fields = errorShape(error)?.fields;
  return typeof fields === "object" && fields !== null
    ? Object.keys(fields)
    : [];
}
