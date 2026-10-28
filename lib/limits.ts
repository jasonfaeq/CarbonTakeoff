/** Hosting platforms cap request bodies at around 4.5 MB, so uploads stop just below that. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
export const RATE_LIMIT_PER_MINUTE = 5;
