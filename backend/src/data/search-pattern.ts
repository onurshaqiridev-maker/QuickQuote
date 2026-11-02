/** Turns user text into a safe LIKE pattern: "50%_off" must not act as wildcards. */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
