const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth[_-]?key/i,
  /credit[_-]?card/i,
  /card[_-]?num/i,
  /cvv/i,
  /cvc/i,
  /ssn/i,
  /social[_-]?security/i,
  /aadhaar/i,
  /pan[_-]?card/i,
  /private[_-]?key/i,
];

export function isSensitiveColumn(columnName: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(columnName));
}

export function sanitizeDatasetColumns(columns: string[]): {
  safeColumns: string[];
  redactedColumns: string[];
} {
  const safeColumns: string[] = [];
  const redactedColumns: string[] = [];

  for (const col of columns) {
    if (isSensitiveColumn(col)) {
      redactedColumns.push(col);
    } else {
      safeColumns.push(col);
    }
  }

  return { safeColumns, redactedColumns };
}
