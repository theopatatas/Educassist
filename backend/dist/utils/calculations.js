"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePercentage = calculatePercentage;
exports.calculateQuizScore = calculateQuizScore;
exports.calculateAttendancePercentage = calculateAttendancePercentage;
exports.calculateFinalSubjectAverage = calculateFinalSubjectAverage;
exports.calculateOverallStudentAverage = calculateOverallStudentAverage;
function finiteNonNegative(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function calculatePercentage(earned, total) {
    const safeEarned = finiteNonNegative(earned);
    const safeTotal = finiteNonNegative(total);
    if (safeTotal === 0)
        return 0;
    return Math.round((Math.min(safeEarned, safeTotal) / safeTotal) * 100);
}
function calculateQuizScore(earnedPoints, totalPoints, penaltyPoints = 0) {
    const adjustedEarned = Math.max(0, finiteNonNegative(earnedPoints) - finiteNonNegative(penaltyPoints));
    return calculatePercentage(adjustedEarned, totalPoints);
}
function calculateAttendancePercentage(present, total) {
    return calculatePercentage(present, total);
}
function calculateFinalSubjectAverage(quarterlyGrades) {
    if (quarterlyGrades.length !== 4 ||
        quarterlyGrades.some((grade) => grade === null || grade === undefined || !Number.isFinite(grade))) {
        return null;
    }
    return Math.round(quarterlyGrades.reduce((sum, grade) => sum + grade, 0) / 4);
}
function calculateOverallStudentAverage(finalSubjectAverages) {
    const grades = finalSubjectAverages.filter((grade) => grade !== null && grade !== undefined && Number.isFinite(grade));
    if (!grades.length || grades.length !== finalSubjectAverages.length)
        return null;
    return Math.round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length);
}
