"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePercentage = calculatePercentage;
exports.calculateQuizScore = calculateQuizScore;
exports.calculateAttendancePercentage = calculateAttendancePercentage;
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
