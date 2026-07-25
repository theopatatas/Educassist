const TEACHER_SENTENCE_DISALLOWED =
  /[^\p{L}\p{N}\s.,!?'"():\-–—]/gu;

/**
 * Keeps letters from any language, numbers, whitespace, and ordinary
 * sentence punctuation. HTML entities, markup, and programming symbols are
 * removed before controlled teacher form state is updated.
 */
export function sanitizeTeacherSentence(value: string) {
  return value.replace(TEACHER_SENTENCE_DISALLOWED, "");
}

export function isTeacherTextControl(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement {
  if (target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return ["text", "search"].includes(target.type);
}
