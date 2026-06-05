export const INTAKE_MAX_BATCH_SIZE = Number(
  process.env.INTAKE_MAX_BATCH_SIZE ?? 10_000,
);

export const INTAKE_DB_CHUNK_SIZE = Number(
  process.env.INTAKE_DB_CHUNK_SIZE ?? 500,
);

export const MAX_URL_LENGTH = 2048;

export const URL_LINE_SPLIT_REGEX = /[\r\n,;\t]+/;

export const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/,
];
