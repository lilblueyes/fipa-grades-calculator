export function sanitizeString(str) {
  return str.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "").toLowerCase();
}

export function parseDecimal(value) {
  if (typeof value !== "string") return Number.NaN;
  return parseFloat(value.trim().replace(",", "."));
}

export function formatDecimal(value) {
  return value.toFixed(2).replace(".", ",");
}
