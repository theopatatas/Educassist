"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACADEMIC_TERMS = void 0;
exports.normalizeAcademicTerm = normalizeAcademicTerm;
exports.normalizeActiveAcademicTerm = normalizeActiveAcademicTerm;
exports.gradeItemTermCandidates = gradeItemTermCandidates;
exports.normalizeAcademicPeriodText = normalizeAcademicPeriodText;
exports.ACADEMIC_TERMS = ["Term 1", "Term 2", "Term 3"];
function normalizeAcademicTerm(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    const match = normalized.match(/(?:term|quarter)?\s*([1-3])/);
    if (match)
        return `Term ${match[1]}`;
    if (normalized.startsWith("1st"))
        return "Term 1";
    if (normalized.startsWith("2nd"))
        return "Term 2";
    if (normalized.startsWith("3rd"))
        return "Term 3";
    return "";
}
function normalizeActiveAcademicTerm(value) {
    const current = normalizeAcademicTerm(value);
    if (current)
        return current;
    return /(?:quarter|term)?\s*4|4th/i.test(String(value ?? ""))
        ? "Term 3"
        : "";
}
function gradeItemTermCandidates(term) {
    const number = term.slice(-1);
    const ordinal = number === "1" ? "1st" : number === "2" ? "2nd" : "3rd";
    return [term, `${ordinal} Grading`];
}
function normalizeAcademicPeriodText(value) {
    return String(value ?? "")
        .replace(/Quarter\s*([1-3])/gi, "Term $1")
        .replace(/Quarter\s*4/gi, "Term 3")
        .replace(/\bQuarters\b/gi, "Terms")
        .replace(/\bquarter\b/gi, "term");
}
