function finiteNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function calculatePercentage(earned: number, total: number) {
  const safeEarned = finiteNonNegative(earned);
  const safeTotal = finiteNonNegative(total);
  if (safeTotal === 0) return 0;
  return Math.round((Math.min(safeEarned, safeTotal) / safeTotal) * 100);
}

export function calculateQuizScore(
  earnedPoints: number,
  totalPoints: number,
  penaltyPoints = 0,
) {
  const adjustedEarned = Math.max(
    0,
    finiteNonNegative(earnedPoints) - finiteNonNegative(penaltyPoints),
  );
  return calculatePercentage(adjustedEarned, totalPoints);
}

export function calculateAttendancePercentage(present: number, total: number) {
  return calculatePercentage(present, total);
}

export function calculateFinalSubjectAverage(
  quarterlyGrades: Array<number | null | undefined>,
) {
  if (
    quarterlyGrades.length !== 4 ||
    quarterlyGrades.some(
      (grade) => grade === null || grade === undefined || !Number.isFinite(grade),
    )
  ) {
    return null;
  }
  return Math.round(
    (quarterlyGrades as number[]).reduce((sum, grade) => sum + grade, 0) / 4,
  );
}

export function calculateOverallStudentAverage(
  finalSubjectAverages: Array<number | null | undefined>,
) {
  const grades = finalSubjectAverages.filter(
    (grade): grade is number =>
      grade !== null && grade !== undefined && Number.isFinite(grade),
  );
  if (!grades.length || grades.length !== finalSubjectAverages.length)
    return null;
  return Math.round(
    grades.reduce((sum, grade) => sum + grade, 0) / grades.length,
  );
}
