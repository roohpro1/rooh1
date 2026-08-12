import { AppReview } from "../types";

// Dynamic remote apps data architecture:
// Seed data array is empty in codebase to minimize bundle size and ensure high performance.
// Application reviews and data are retrieved dynamically from Cloudflare R2 / Worker / KV.
export const popularAppsSeed: Omit<AppReview, "createdAt">[] = [];
