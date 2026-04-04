const MB = 1024 * 1024;

export const FILE_SIZE_LIMITS = {
  profile: 4 * MB,
  photos: 8 * MB,
  documents: 16 * MB,
  audio: 32 * MB,
} as const;

export const IMAGE_SOURCE_FILE_SIZE_LIMITS = {
  profile: 12 * MB,
  photos: 24 * MB,
  import: 24 * MB,
} as const;

export function formatSizeLimitMb(bytes: number): string {
  const megabytes = bytes / MB;
  return Number.isInteger(megabytes)
    ? `${megabytes}`
    : megabytes.toFixed(1).replace(/\.0$/, "");
}