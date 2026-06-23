// Local copy of the app's `toTitleCase` (was `@/lib/utils`) so the
// package stays decoupled from the web app.
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
  });
}
