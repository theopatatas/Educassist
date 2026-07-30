import { Op } from "sequelize";
import { Assignment } from "../../db/models/Assignment.model";
import { AssignmentSubmission } from "../../db/models/AssignmentSubmission.model";
import { Attendance } from "../../db/models/Attendance.model";
import { Class } from "../../db/models/Class.model";
import { ClassTakeover } from "../../db/models/ClassTakeover.model";
import { ChatLog } from "../../db/models/ChatLog.model";
import { Enrollment } from "../../db/models/Enrollment.model";
import { Grade } from "../../db/models/Grade.model";
import { GradeItem } from "../../db/models/GradeItem.model";
import { LessonPlan } from "../../db/models/LessonPlan.model";
import { Parent } from "../../db/models/Parent.model";
import { ParentStudent } from "../../db/models/ParentStudent.model";
import { Quiz } from "../../db/models/Quiz.model";
import { QuizAttempt } from "../../db/models/QuizAttempt.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { Subject } from "../../db/models/Subject.model";
import { SystemAuditLog } from "../../db/models/SystemAuditLog.model";
import { Teacher } from "../../db/models/Teacher.model";
import { TeacherLeaveRequest } from "../../db/models/TeacherLeaveRequest.model";
import { User } from "../../db/models/User.model";
import { getAcademicContext } from "./settings.service";
import {
  gradeItemTermCandidates,
  normalizeAcademicTerm,
} from "../../utils/academic-terms";

export type AnalyticsFilterInput = {
  schoolYear?: string;
  term?: string;
  quarter?: string;
  gradeLevel?: string;
  section?: string;
  subject?: string;
  teacher?: string;
  student?: string;
  dateFrom?: string;
  dateTo?: string;
};

const number = (value: unknown) => Number(value ?? 0);
const round = (value: number, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};
const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const dateValue = (model: { getDataValue(key: string): unknown }, key: string) =>
  model.getDataValue(key) as Date | null;
const monthLabel = (value: Date) =>
  value.toLocaleDateString("en-US", { month: "short", year: "numeric" });
const dateWhere = (from?: string, to?: string) =>
  from || to
    ? {
        ...(from ? { [Op.gte]: new Date(`${from}T00:00:00`) } : {}),
        ...(to ? { [Op.lte]: new Date(`${to}T23:59:59`) } : {}),
      }
    : undefined;
const withinDateRange = (
  value: Date | null,
  from?: string,
  to?: string,
) => {
  if (!value) return false;
  const timestamp = value.getTime();
  if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
  return true;
};

function countBy<T>(rows: T[], key: (row: T) => string) {
  const result = new Map<string, number>();
  rows.forEach((row) => {
    const value = key(row);
    result.set(value, (result.get(value) ?? 0) + 1);
  });
  return result;
}

export async function getAdminAnalytics(filters: AnalyticsFilterInput) {
  const selectedTerm = normalizeAcademicTerm(filters.term ?? filters.quarter);
  const [
    academic,
    sections,
    subjects,
    teachers,
    students,
    classes,
    parents,
    parentLinks,
    users,
    leaves,
    takeovers,
    auditLogs,
    chatLogs,
    lessonPlans,
  ] = await Promise.all([
    getAcademicContext(),
    Section.findAll(),
    Subject.findAll(),
    Teacher.findAll(),
    Student.findAll(),
    Class.findAll(),
    Parent.findAll(),
    ParentStudent.findAll(),
    User.findAll(),
    TeacherLeaveRequest.findAll(),
    ClassTakeover.findAll(),
    SystemAuditLog.findAll({ order: [["createdAt", "DESC"]], limit: 5000 }),
    ChatLog.findAll(),
    LessonPlan.findAll(),
  ]);
  const sectionMap = new Map(sections.map((row) => [number(row.id), row]));
  const selectedSection = sections.find(
    (row) =>
      String(row.id) === filters.section ||
      row.name.toLowerCase() === String(filters.section ?? "").toLowerCase(),
  );
  const selectedSubject = subjects.find(
    (row) =>
      String(row.id) === filters.subject ||
      row.name.toLowerCase() === String(filters.subject ?? "").toLowerCase(),
  );
  const classScope = classes.filter(
    (row) =>
      (!filters.schoolYear ||
        sectionMap.get(number(row.sectionId))?.schoolYear ===
          filters.schoolYear) &&
      (!filters.gradeLevel || row.gradeLevel === filters.gradeLevel) &&
      (!filters.section || number(row.sectionId) === number(selectedSection?.id)) &&
      (!filters.subject || number(row.subjectId) === number(selectedSubject?.id)) &&
      (!filters.teacher || String(row.teacherId) === filters.teacher),
  );
  const hasClassFilter = Boolean(
    filters.schoolYear ||
      filters.gradeLevel ||
      filters.section ||
      filters.subject ||
      filters.teacher,
  );
  const classIds = new Set(classScope.map((row) => number(row.id)));
  const studentScope = students.filter(
    (row) =>
      (!filters.student || String(row.id) === filters.student) &&
      (!filters.gradeLevel || row.yearLevel === filters.gradeLevel) &&
      (!filters.section || number(row.sectionId) === number(selectedSection?.id)),
  );
  const hasStudentFilter = Boolean(
    filters.student || filters.gradeLevel || filters.section,
  );
  const studentIds = new Set(studentScope.map((row) => number(row.id)));
  const enrollmentWhere: Record<string, unknown> = {};
  const enrollmentDates = dateWhere(filters.dateFrom, filters.dateTo);
  if (enrollmentDates) enrollmentWhere.enrolledAt = enrollmentDates;
  const [enrollments, attendance, gradeItems, assignments, quizzes] =
    await Promise.all([
      Enrollment.findAll({ where: enrollmentWhere }),
      Attendance.findAll({
        where: {
          ...(filters.dateFrom || filters.dateTo
            ? {
                date: {
                  ...(filters.dateFrom ? { [Op.gte]: filters.dateFrom } : {}),
                  ...(filters.dateTo ? { [Op.lte]: filters.dateTo } : {}),
                },
              }
            : {}),
        },
      }),
      GradeItem.findAll({
        where: {
          ...(filters.schoolYear ? { academicYear: filters.schoolYear } : {}),
          ...(filters.gradeLevel ? { gradeLevel: filters.gradeLevel } : {}),
          ...(selectedTerm
            ? {
                [Op.or]: gradeItemTermCandidates(
                  selectedTerm,
                ).map((term) => ({
                  name: { [Op.like]: `${term}|%` },
                })),
              }
            : {}),
        },
      }),
      Assignment.findAll({
        where: {
          ...(enrollmentDates ? { createdAt: enrollmentDates } : {}),
        },
      }),
      Quiz.findAll({
        where: {
          ...(enrollmentDates ? { createdAt: enrollmentDates } : {}),
        },
      }),
    ]);
  const scopedEnrollments = enrollments.filter(
    (row) =>
      (!hasClassFilter || classIds.has(number(row.classId))) &&
      (!hasStudentFilter || studentIds.has(number(row.studentId))),
  );
  const scopedAttendance = attendance.filter(
    (row) =>
      (!hasClassFilter || classIds.has(number(row.classId))) &&
      (!hasStudentFilter || studentIds.has(number(row.studentId))),
  );
  const scopedGradeItems = gradeItems.filter(
    (row) =>
      (!hasClassFilter || classIds.has(number(row.classId))) &&
      String(row.name).toLowerCase().endsWith("|published"),
  );
  const gradeItemIds = scopedGradeItems.map((row) => number(row.id));
  const grades = gradeItemIds.length
    ? await Grade.findAll({ where: { gradeItemId: gradeItemIds } })
    : [];
  const scopedGrades = grades.filter(
    (row) => !hasStudentFilter || studentIds.has(number(row.studentId)),
  );
  const scopedAssignments = assignments.filter(
    (row) =>
      row.classId && (!hasClassFilter || classIds.has(number(row.classId))),
  );
  const assignmentIds = scopedAssignments.map((row) => number(row.id));
  const assignmentSubmissions = assignmentIds.length
    ? await AssignmentSubmission.findAll({
        where: { assignmentId: assignmentIds },
      })
    : [];
  const scopedQuizzes = quizzes.filter(
    (row) =>
      row.classId && (!hasClassFilter || classIds.has(number(row.classId))),
  );
  const quizIds = scopedQuizzes.map((row) => number(row.id));
  const quizAttempts = quizIds.length
    ? await QuizAttempt.findAll({ where: { quizId: quizIds } })
    : [];

  const enrollmentMonths = countBy(scopedEnrollments, (row) =>
    monthLabel(row.enrolledAt || dateValue(row, "createdAt") || new Date()),
  );
  const attendanceStatus = countBy(scopedAttendance, (row) =>
    row.status.toLowerCase(),
  );
  const attendanceTotal = scopedAttendance.length;
  const present = attendanceStatus.get("present") ?? 0;
  const late = attendanceStatus.get("late") ?? 0;
  const absent = attendanceStatus.get("absent") ?? 0;
  const attendanceRate = attendanceTotal
    ? round(((present + late) / attendanceTotal) * 100)
    : 0;
  const attendanceTrend = (format: "daily" | "weekly" | "monthly") => {
    const groups = new Map<string, { attended: number; total: number }>();
    scopedAttendance.forEach((row) => {
      const date = new Date(`${row.date}T00:00:00`);
      const label =
        format === "daily"
          ? row.date
          : format === "monthly"
            ? monthLabel(date)
            : `Week of ${new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()).toLocaleDateString()}`;
      const current = groups.get(label) ?? { attended: 0, total: 0 };
      current.total += 1;
      if (row.status !== "absent") current.attended += 1;
      groups.set(label, current);
    });
    return [...groups].slice(-12).map(([label, value]) => ({
      label,
      value: value.total ? round((value.attended / value.total) * 100) : 0,
    }));
  };

  const gradesByStudent = new Map<number, number[]>();
  const gradesByClass = new Map<number, number[]>();
  const itemMap = new Map(scopedGradeItems.map((row) => [number(row.id), row]));
  scopedGrades.forEach((row) => {
    const score = number(row.score);
    const studentValues = gradesByStudent.get(number(row.studentId)) ?? [];
    studentValues.push(score);
    gradesByStudent.set(number(row.studentId), studentValues);
    const item = itemMap.get(number(row.gradeItemId));
    if (item) {
      const classValues = gradesByClass.get(number(item.classId)) ?? [];
      classValues.push(score);
      gradesByClass.set(number(item.classId), classValues);
    }
  });
  const studentAverages = [...gradesByStudent].map(([studentId, values]) => ({
    studentId,
    average: round(average(values) ?? 0),
  }));
  const performanceGroups = new Map<string, number[]>();
  scopedGrades.forEach((row) => {
    const item = itemMap.get(number(row.gradeItemId));
    if (!item) return;
    const label =
      normalizeAcademicTerm(String(item.name).split("|")[0]) ||
      "Published Grades";
    const values = performanceGroups.get(label) ?? [];
    values.push(number(row.score));
    performanceGroups.set(label, values);
  });
  const overallAverage = average(studentAverages.map((row) => row.average));
  const passing = studentAverages.filter((row) => row.average >= 75).length;
  const gradeLevelValues = new Map<string, number[]>();
  studentAverages.forEach((row) => {
    const student = students.find((item) => number(item.id) === row.studentId);
    const key = student?.yearLevel || "Unassigned";
    const values = gradeLevelValues.get(key) ?? [];
    values.push(row.average);
    gradeLevelValues.set(key, values);
  });
  const gradeLevelAverages = [...gradeLevelValues].map(([label, values]) => ({
    label,
    value: round(average(values) ?? 0),
  }));
  const sortedGradeLevels = [...gradeLevelAverages].sort(
    (left, right) => right.value - left.value,
  );

  const subjectRows = subjects
    .map((subject) => {
      const matchingClasses = classScope.filter(
        (row) => number(row.subjectId) === number(subject.id),
      );
      const values = matchingClasses.flatMap(
        (row) => gradesByClass.get(number(row.id)) ?? [],
      );
      const enrolled = new Set(
        scopedEnrollments
          .filter((row) =>
            matchingClasses.some((item) => number(item.id) === number(row.classId)),
          )
          .map((row) => number(row.studentId)),
      );
      return {
        id: number(subject.id),
        name: subject.name,
        averageGrade: values.length ? round(average(values) ?? 0) : null,
        studentCount: enrolled.size,
        teacherCount: new Set(matchingClasses.map((row) => row.teacherId)).size,
      };
    })
    .filter(
      (row) =>
        row.studentCount > 0 ||
        row.teacherCount > 0 ||
        row.averageGrade !== null,
    );
  const rankedSubjects = subjectRows
    .filter((row) => row.averageGrade !== null)
    .sort(
      (left, right) =>
        number(right.averageGrade) - number(left.averageGrade),
    );

  const sectionRows = sections
    .map((section) => {
      const matchingStudents = studentScope.filter(
        (row) => number(row.sectionId) === number(section.id),
      );
      const matchingClasses = classScope.filter(
        (row) => number(row.sectionId) === number(section.id),
      );
      const sectionStudentIds = new Set(
        matchingStudents.map((row) => number(row.id)),
      );
      const gradeValues = studentAverages
        .filter((row) => sectionStudentIds.has(row.studentId))
        .map((row) => row.average);
      const attendanceRows = scopedAttendance.filter((row) =>
        sectionStudentIds.has(number(row.studentId)),
      );
      const adviser = teachers.find(
        (row) => number(row.sectionId) === number(section.id),
      );
      return {
        id: number(section.id),
        name: section.name,
        adviser: adviser
          ? `${adviser.firstName} ${adviser.lastName}`.trim()
          : null,
        studentCount: matchingStudents.length,
        averageGrade: gradeValues.length
          ? round(average(gradeValues) ?? 0)
          : null,
        attendanceRate: attendanceRows.length
          ? round(
              (attendanceRows.filter((row) => row.status !== "absent").length /
                attendanceRows.length) *
                100,
            )
          : null,
        classCount: matchingClasses.length,
      };
    })
    .filter((row) => row.studentCount || row.classCount);

  const gradeComparison = [...new Set(studentScope.map((row) => row.yearLevel || "Unassigned"))].map(
    (gradeLevel) => {
      const matching = studentScope.filter(
        (row) => (row.yearLevel || "Unassigned") === gradeLevel,
      );
      const ids = new Set(matching.map((row) => number(row.id)));
      const gradeRows = studentAverages.filter((row) => ids.has(row.studentId));
      const attendanceRows = scopedAttendance.filter((row) =>
        ids.has(number(row.studentId)),
      );
      return {
        gradeLevel,
        studentCount: matching.length,
        averageGrade: gradeRows.length
          ? round(average(gradeRows.map((row) => row.average)) ?? 0)
          : null,
        attendanceRate: attendanceRows.length
          ? round(
              (attendanceRows.filter((row) => row.status !== "absent").length /
                attendanceRows.length) *
                100,
            )
          : null,
        passingRate: gradeRows.length
          ? round(
              (gradeRows.filter((row) => row.average >= 75).length /
                gradeRows.length) *
                100,
            )
          : null,
      };
    },
  );

  const teacherWorkload = teachers
    .filter((teacher) => !filters.teacher || String(teacher.id) === filters.teacher)
    .map((teacher) => {
      const assigned = classScope.filter(
        (row) => number(row.teacherId) === number(teacher.id),
      );
      const enrolled = new Set(
        scopedEnrollments
          .filter((row) => assigned.some((item) => number(item.id) === number(row.classId)))
          .map((row) => number(row.studentId)),
      );
      return {
        id: number(teacher.id),
        name: `${teacher.firstName} ${teacher.lastName}`.trim(),
        subjects: new Set(assigned.map((row) => row.subjectId).filter(Boolean)).size,
        sections: new Set(assigned.map((row) => row.sectionId).filter(Boolean)).size,
        students: enrolled.size,
        averageGrade: assigned.flatMap(
          (row) => gradesByClass.get(number(row.id)) ?? [],
        ).length
          ? round(
              average(
                assigned.flatMap(
                  (row) => gradesByClass.get(number(row.id)) ?? [],
                ),
              ) ?? 0,
            )
          : null,
      };
    });
  const workloadValues = teacherWorkload.map((row) => row.students);
  const assignmentSubmitted = assignmentSubmissions.filter(
    (row) =>
      row.submittedAt &&
      (!hasStudentFilter || studentIds.has(number(row.studentId))),
  ).length;
  const assignmentExpected = scopedAssignments.reduce(
    (sum, assignment) =>
      sum +
      new Set(
        scopedEnrollments
          .filter((row) => number(row.classId) === number(assignment.classId))
          .map((row) => row.studentId),
      ).size,
    0,
  );
  const completedQuizAttempts = quizAttempts.filter(
    (row) =>
      row.completedAt &&
      (!hasStudentFilter || studentIds.has(number(row.studentId))),
  );
  const linkedStudentIds = new Set(parentLinks.map((row) => number(row.studentId)));
  const parentUsers = users.filter((row) => String(row.role).toUpperCase() === "PARENT");
  const scopedUsers = filters.dateFrom || filters.dateTo
    ? users.filter((row) =>
        withinDateRange(
          dateValue(row, "createdAt"),
          filters.dateFrom,
          filters.dateTo,
        ),
      )
    : users;
  const scopedLeaves = filters.dateFrom || filters.dateTo
    ? leaves.filter((row) =>
        withinDateRange(
          dateValue(row, "createdAt"),
          filters.dateFrom,
          filters.dateTo,
        ),
      )
    : leaves;
  const scopedTakeovers = filters.dateFrom || filters.dateTo
    ? takeovers.filter((row) =>
        withinDateRange(
          dateValue(row, "createdAt"),
          filters.dateFrom,
          filters.dateTo,
        ),
      )
    : takeovers;
  const scopedAuditLogs = filters.dateFrom || filters.dateTo
    ? auditLogs.filter((row) =>
        withinDateRange(row.createdAt, filters.dateFrom, filters.dateTo),
      )
    : auditLogs;
  const scopedChatLogs = chatLogs.filter(
    (row) =>
      (!filters.teacher ||
        String(row.userId) ===
          String(
            teachers.find((teacher) => String(teacher.id) === filters.teacher)
              ?.userId ?? "",
          )) &&
      (!(filters.dateFrom || filters.dateTo) ||
        withinDateRange(
          dateValue(row, "createdAt"),
          filters.dateFrom,
          filters.dateTo,
        )),
  );
  const scopedLessonPlans = lessonPlans.filter(
    (row) =>
      (!filters.teacher || String(row.teacherId) === filters.teacher) &&
      (!filters.gradeLevel || row.gradeLevel === filters.gradeLevel) &&
      (!filters.subject ||
        row.subject.toLowerCase() ===
          String(selectedSubject?.name ?? "").toLowerCase()) &&
      (!(filters.dateFrom || filters.dateTo) ||
        withinDateRange(row.createdAt, filters.dateFrom, filters.dateTo)),
  );
  const registrationMonths = countBy(scopedUsers, (row) =>
    monthLabel(dateValue(row, "createdAt") || new Date()),
  );
  const activityDays = countBy(scopedAuditLogs, (row) =>
    row.createdAt.toISOString().slice(0, 10),
  );
  const leaveCounts = countBy(scopedLeaves, (row) => row.status);
  const takeoverCounts = countBy(scopedTakeovers, (row) => row.status);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const newStudents = studentScope.filter((row) =>
    filters.dateFrom || filters.dateTo
      ? withinDateRange(
          dateValue(row, "createdAt"),
          filters.dateFrom,
          filters.dateTo,
        )
      : String(dateValue(row, "createdAt")?.toISOString() ?? "").startsWith(
          currentMonth,
        ),
  ).length;
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = previousMonthDate.toISOString().slice(0, 7);
  const previousNewStudents = students.filter((row) =>
    String(dateValue(row, "createdAt")?.toISOString() ?? "").startsWith(previousMonth),
  ).length;
  const enrollmentGrowth = previousNewStudents
    ? round(((newStudents - previousNewStudents) / previousNewStudents) * 100)
    : null;
  const incompleteProfiles = studentScope.filter(
    (row) =>
      !row.gender ||
      !row.studentMobileNumber ||
      !row.guardianName ||
      !row.guardianContact,
  ).length;

  return {
    updatedAt: new Date().toISOString(),
    academic,
    filterOptions: {
      schoolYears: [...new Set(sections.map((row) => row.schoolYear).filter(Boolean))],
      gradeLevels: [...new Set(students.map((row) => row.yearLevel).filter(Boolean))],
      sections: sections.map((row) => ({ id: row.id, name: row.name })),
      subjects: subjects.map((row) => ({ id: row.id, name: row.name })),
      teachers: teachers.map((row) => ({
        id: row.id,
        name: `${row.firstName} ${row.lastName}`.trim(),
      })),
      students: students.map((row) => ({
        id: row.id,
        name: `${row.firstName} ${row.lastName}`.trim(),
      })),
    },
    kpis: {
      totalStudents: studentScope.length,
      totalTeachers: teacherWorkload.length,
      totalSubjects: subjectRows.length,
      totalSections: sectionRows.length,
      enrollmentGrowth,
      averageAttendance: attendanceRate,
      averagePerformance: overallAverage === null ? null : round(overallAverage),
      passingRate: studentAverages.length
        ? round((passing / studentAverages.length) * 100)
        : null,
    },
    enrollmentTrend: [...enrollmentMonths]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, value]) => ({ label, value })),
    enrollmentStatus: {
      newStudents,
      graduated: studentScope.filter((row) => Boolean(row.graduatedAt)).length,
      inactive: studentScope.filter((row) => Boolean(row.archivedAt)).length,
    },
    performance: studentAverages.length
      ? {
          overallAverage: round(overallAverage ?? 0),
          passingRate: round((passing / studentAverages.length) * 100),
          honorStudents: studentAverages.filter((row) => row.average >= 90).length,
          atRisk: studentAverages.filter((row) => row.average < 75).length,
          highestGradeLevel: sortedGradeLevels[0]?.label ?? null,
          lowestGradeLevel: sortedGradeLevels.at(-1)?.label ?? null,
          gradeDistribution: {
            outstanding: studentAverages.filter((row) => row.average >= 90).length,
            proficient: studentAverages.filter((row) => row.average >= 85 && row.average < 90).length,
            passing: studentAverages.filter((row) => row.average >= 75 && row.average < 85).length,
            failing: studentAverages.filter((row) => row.average < 75).length,
          },
        }
      : null,
    performanceTrend: [...performanceGroups].map(([label, values]) => ({
      label,
      value: round(average(values) ?? 0),
    })),
    attendance: {
      present,
      late,
      absent,
      rate: attendanceRate,
      daily: attendanceTrend("daily"),
      weekly: attendanceTrend("weekly"),
      monthly: attendanceTrend("monthly"),
    },
    teacherWorkload,
    teacherWorkloadSummary: workloadValues.length
      ? {
          highest: Math.max(...workloadValues),
          lowest: Math.min(...workloadValues),
          average: round(average(workloadValues) ?? 0),
        }
      : null,
    subjects: subjectRows,
    subjectSummary: {
      highestPerforming: rankedSubjects[0]?.name ?? null,
      lowestPerforming: rankedSubjects.at(-1)?.name ?? null,
    },
    sections: sectionRows,
    gradeComparison,
    assignments: {
      total: scopedAssignments.length,
      submitted: assignmentSubmitted,
      expected: assignmentExpected,
      completionRate: assignmentExpected
        ? round((assignmentSubmitted / assignmentExpected) * 100)
        : null,
    },
    quizzes: {
      total: scopedQuizzes.length,
      attempts: quizAttempts.length,
      completedAttempts: completedQuizAttempts.length,
      averageScore: completedQuizAttempts.length
        ? round(average(completedQuizAttempts.map((row) => number(row.score))) ?? 0)
        : null,
    },
    aiUsage: {
      conversations: scopedChatLogs.length,
      teacherConversations: scopedChatLogs.filter(
        (row) => row.role.toLowerCase() === "teacher",
      ).length,
      lessonPlans: scopedLessonPlans.length,
      finalizedLessonPlans: scopedLessonPlans.filter(
        (row) => row.status === "final",
      ).length,
    },
    parents: {
      total: parents.length,
      linkedStudents: studentScope.filter((row) => linkedStudentIds.has(number(row.id))).length,
      coverageRate: studentScope.length
        ? round(
            (studentScope.filter((row) => linkedStudentIds.has(number(row.id))).length /
              studentScope.length) *
              100,
          )
        : null,
      loggedIn: parentUsers.filter((row) => Boolean(row.lastLoginAt)).length,
    },
    leaves: {
      total: scopedLeaves.length,
      pending: leaveCounts.get("PENDING") ?? 0,
      approved: leaveCounts.get("APPROVED") ?? 0,
      active: leaveCounts.get("ACTIVE_LEAVE") ?? 0,
      completed: leaveCounts.get("COMPLETED") ?? 0,
      rejected: leaveCounts.get("REJECTED") ?? 0,
    },
    takeovers: {
      total: scopedTakeovers.length,
      active: takeoverCounts.get("ACTIVE") ?? 0,
      completed: takeoverCounts.get("COMPLETED") ?? 0,
      cancelled: takeoverCounts.get("CANCELLED") ?? 0,
    },
    registrationTrend: [...registrationMonths]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-12)
      .map(([label, value]) => ({ label, value })),
    activityTrend: [...activityDays]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-14)
      .map(([label, value]) => ({ label, value })),
    insights: [
      ...(sortedGradeLevels[0]
        ? [{ id: "highest-grade", label: "Highest Performing Grade Level", value: sortedGradeLevels[0].label }]
        : []),
      ...(rankedSubjects[0]
        ? [{ id: "best-subject", label: "Best Performing Subject", value: rankedSubjects[0].name }]
        : []),
      ...(gradeComparison.length
        ? [{
            id: "highest-attendance",
            label: "Highest Attendance Rate",
            value: [...gradeComparison].sort(
              (left, right) => number(right.attendanceRate) - number(left.attendanceRate),
            )[0]?.gradeLevel,
          }]
        : []),
    ],
    dataQuality: [
      { id: "incomplete-profiles", label: "Students with incomplete profiles", count: incompleteProfiles },
      { id: "missing-grades", label: "Students without published grades", count: studentScope.filter((row) => !gradesByStudent.has(number(row.id))).length },
      { id: "missing-attendance", label: "Students without attendance records", count: studentScope.filter((row) => !scopedAttendance.some((item) => number(item.studentId) === number(row.id))).length },
      { id: "subjects-without-teachers", label: "Subjects without assigned teachers", count: subjects.filter((subject) => !classes.some((row) => number(row.subjectId) === number(subject.id))).length },
      { id: "sections-without-advisers", label: "Sections without advisers", count: sections.filter((section) => !teachers.some((row) => number(row.sectionId) === number(section.id))).length },
    ].filter((row) => row.count > 0),
    exports: { pdf: true, excel: true, csv: true },
  };
}

export function analyticsExportRows(
  analytics: Awaited<ReturnType<typeof getAdminAnalytics>>,
) {
  return [
    ["Metric", "Value"],
    ["Total Students", analytics.kpis.totalStudents],
    ["Total Teachers", analytics.kpis.totalTeachers],
    ["Total Subjects", analytics.kpis.totalSubjects],
    ["Total Sections", analytics.kpis.totalSections],
    ["Average Attendance", analytics.kpis.averageAttendance],
    ["Average Performance", analytics.kpis.averagePerformance ?? ""],
    ["Passing Rate", analytics.kpis.passingRate ?? ""],
    ["Assignments", analytics.assignments.total],
    ["Assignment Completion Rate", analytics.assignments.completionRate ?? ""],
    ["Quizzes", analytics.quizzes.total],
    ["Quiz Average Score", analytics.quizzes.averageScore ?? ""],
    ["Parent Coverage", analytics.parents.coverageRate ?? ""],
    ["Leave Requests", analytics.leaves.total],
    ["Active Takeovers", analytics.takeovers.active],
  ];
}
