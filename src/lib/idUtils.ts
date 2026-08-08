// Helper utility for generating short, unique 5-digit numeric IDs for app pages
export function generateShortId(): string {
  // Generates a 5-digit number string between 10000 and 99999
  return Math.floor(10000 + Math.random() * 90000).toString();
}
