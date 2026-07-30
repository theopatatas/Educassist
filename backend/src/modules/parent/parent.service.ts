import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { sequelize } from "../../config/db";
import { Attendance } from "../../db/models/Attendance.model";
import {
  calculateAttendancePercentage,
  calculateFinalSubjectAverage,
  calculateOverallStudentAverage,
} from "../../utils/calculations";
import { Class } from "../../db/models/Class.model";
import { Exam } from "../../db/models/Exam.model";
import { Grade } from "../../db/models/Grade.model";
import { GradeItem } from "../../db/models/GradeItem.model";
import { Parent } from "../../db/models/Parent.model";
import { ParentStudent } from "../../db/models/ParentStudent.model";
import { Section } from "../../db/models/Section.model";
import { QuizAttempt } from "../../db/models/QuizAttempt.model";
import { Student } from "../../db/models/Student.model";
import { User } from "../../db/models/User.model";
import { getAcademicContext } from "../admin/settings.service";
import {
  getStudentAcademicRecordById,
  getStudentAcademicSessionsById,
} from "../student/student.service";
import { ACADEMIC_TERMS, normalizeAcademicTerm } from "../../utils/academic-terms";

function emptyTermGradeTable() {
  return ACADEMIC_TERMS.map((term) => ({
    term,
    math: 0,
    science: 0,
    english: 0,
    filipino: 0,
    mapeh: 0,
    ap: 0,
    tle: 0,
    values: 0,
  }));
}

export type CreateParentInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  studentId?: string;
};

export type UpdateParentInput = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  studentId?: string | null;
};

export async function createParent(input: CreateParentInput) {
  return sequelize.transaction(async (t) => {
    const existing = await User.findOne({
      where: { email: input.email },
      transaction: t,
    });
    if (existing) {
      return {
        ok: false as const,
        code: 409 as const,
        message: "Email already in use",
      };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await User.create(
      {
        email: input.email,
        passwordHash,
        role: "parent",
        refreshTokenHash: null,
      },
      { transaction: t },
    );

    const parent = await Parent.create(
      {
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        studentId: input.studentId ?? null,
      },
      { transaction: t },
    );
    if (input.studentId) {
      await ParentStudent.findOrCreate({
        where: {
          parentId: parent.id,
          studentId: Number(input.studentId),
        },
        defaults: {
          parentId: parent.id,
          studentId: Number(input.studentId),
        },
        transaction: t,
      });
    }

    return {
      ok: true as const,
      parent,
      user: { id: user.id, email: user.email, role: user.role },
    };
  });
}

export async function listParents() {
  return Parent.findAll({ order: [["createdAt", "DESC"]] });
}

export async function getParentById(id: string) {
  return Parent.findByPk(id);
}

export async function getParentByUserId(userId: string) {
  return Parent.findOne({ where: { userId } });
}

async function linkedStudentIds(parent: Parent) {
  const links = await ParentStudent.findAll({
    where: { parentId: parent.id },
    attributes: ["studentId"],
  });
  const ids = links.map((link) => Number(link.studentId));
  if (parent.studentId) ids.push(Number(parent.studentId));
  return [...new Set(ids.filter(Boolean))];
}

export async function getParentLinkedStudentsByUserId(userId: string) {
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  const ids = await linkedStudentIds(parent);
  if (!ids.length) return [];
  const students = await Student.findAll({
    where: { id: ids },
    attributes: [
      "id",
      "firstName",
      "middleName",
      "lastName",
      "yearLevel",
      "sectionId",
      "graduatedAt",
      "archivedAt",
    ],
  });
  const sectionIds = students
    .map((student) => Number(student.sectionId))
    .filter(Boolean);
  const sections = sectionIds.length
    ? await Section.findAll({
        where: { id: sectionIds },
        attributes: ["id", "name"],
      })
    : [];
  const sectionNames = new Map(
    sections.map((section) => [Number(section.id), section.name]),
  );
  return students
    .map((student) => ({
      id: Number(student.id),
      name: [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" "),
      gradeLevel: student.yearLevel ?? null,
      sectionId: student.sectionId ? Number(student.sectionId) : null,
      sectionName: student.sectionId
        ? sectionNames.get(Number(student.sectionId)) ?? null
        : null,
      graduated: Boolean(student.graduatedAt),
      archived: Boolean(student.archivedAt),
      primary: Number(parent.studentId) === Number(student.id),
    }))
    .sort((left, right) => {
      if (left.primary !== right.primary) return left.primary ? -1 : 1;
      if (left.archived !== right.archived) return left.archived ? 1 : -1;
      return left.name.localeCompare(right.name);
    });
}

async function resolveParentStudent(parent: Parent, requestedStudentId?: string) {
  const ids = await linkedStudentIds(parent);
  if (!ids.length) return { student: null, allowed: true };
  const requested = requestedStudentId ? Number(requestedStudentId) : null;
  if (requested && !ids.includes(requested))
    return { student: null, allowed: false };
  const selectedId =
    requested ||
    (parent.studentId && ids.includes(Number(parent.studentId))
      ? Number(parent.studentId)
      : ids[0]);
  return {
    student: await Student.findByPk(selectedId),
    allowed: true,
  };
}

export async function parentCanAccessStudent(
  userId: string,
  requestedStudentId?: string,
) {
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  const selected = await resolveParentStudent(parent, requestedStudentId);
  return selected.allowed;
}

export async function getParentSelectedStudentByUserId(
  userId: string,
  requestedStudentId?: string,
) {
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  const selected = await resolveParentStudent(parent, requestedStudentId);
  if (!selected.allowed) return { forbidden: true as const };
  if (!selected.student) return { student: null };
  const section = selected.student.sectionId
    ? await Section.findByPk(selected.student.sectionId, {
        attributes: ["id", "name"],
      })
    : null;
  return {
    student: {
      id: Number(selected.student.id),
      gradeLevel: selected.student.yearLevel ?? null,
      sectionId: selected.student.sectionId
        ? Number(selected.student.sectionId)
        : null,
      sectionName: section?.name ?? null,
    },
  };
}

export async function getParentAcademicSessionsByUserId(
  userId: string,
  requestedStudentId?: string,
) {
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  const selected = await resolveParentStudent(parent, requestedStudentId);
  if (!selected.allowed) return { forbidden: true as const };
  if (!selected.student) return [];
  return getStudentAcademicSessionsById(String(selected.student.id));
}

export async function getParentAcademicRecordByUserId(
  userId: string,
  filter?: {
    studentId?: string;
    academicYear?: string;
    gradeLevel?: string;
  },
) {
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  const selected = await resolveParentStudent(parent, filter?.studentId);
  if (!selected.allowed) return { forbidden: true as const };
  if (!selected.student)
    return { linkedStudent: false as const, record: null };
  const record = await getStudentAcademicRecordById(
    String(selected.student.id),
    filter,
  );
  return { linkedStudent: true as const, record };
}

export async function getParentOverviewByUserId(
  userId: string,
  requestedStudentId?: string,
) {
  const academic = await getAcademicContext();
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  const selected = await resolveParentStudent(parent, requestedStudentId);
  if (!selected.allowed) return { forbidden: true as const };
  if (!selected.student) {
    return {
      linkedStudent: null,
      attendance: { present: 0, late: 0, absent: 0, rate: 0 },
      quizzes: { submitted: 0, averageScore: 0 },
      exams: { upcoming: 0, completed: 0 },
      grades: { average: 0, publishedCount: 0 },
      gradeTable: emptyTermGradeTable(),
    };
  }

  const student = selected.student;
  if (!student) {
    return {
      linkedStudent: null,
      attendance: { present: 0, late: 0, absent: 0, rate: 0 },
      quizzes: { submitted: 0, averageScore: 0 },
      exams: { upcoming: 0, completed: 0 },
      grades: { average: 0, publishedCount: 0 },
      gradeTable: emptyTermGradeTable(),
    };
  }

  const [attendanceRows, quizAttempts, classes] = await Promise.all([
    Attendance.findAll({ where: { studentId: student.id } }),
    QuizAttempt.findAll({
      where: {
        studentId: student.id,
        completedAt: { [Op.ne]: null },
      },
    }),
    student.sectionId && student.yearLevel
      ? Class.findAll({
          where: {
            sectionId: student.sectionId,
            gradeLevel: student.yearLevel,
          },
          attributes: ["id"],
        })
      : Promise.resolve([]),
  ]);

  const present = attendanceRows.filter(
    (row) => row.status === "present",
  ).length;
  const late = attendanceRows.filter((row) => row.status === "late").length;
  const absent = attendanceRows.filter((row) => row.status === "absent").length;
  const attendanceRate = calculateAttendancePercentage(
    present,
    attendanceRows.length,
  );

  const quizSubmitted = quizAttempts.length;
  const quizAverage = quizSubmitted
    ? Math.round(
        quizAttempts.reduce((sum, row) => sum + Number(row.score ?? 0), 0) /
          quizSubmitted,
      )
    : 0;

  const classIds = classes.map((row) => Number(row.id));

  const [examRows, gradeItems] = await Promise.all([
    classIds.length
      ? Exam.findAll({
          where: { classId: classIds },
          attributes: ["id", "examDate", "status"],
        })
      : Promise.resolve([]),
    classIds.length
      ? GradeItem.findAll({
          where: {
            classId: classIds,
            ...(academic.currentSchoolYear
              ? { academicYear: academic.currentSchoolYear }
              : {}),
            name: { [Op.like]: "%|published" },
          },
          attributes: ["id", "name"],
        })
      : Promise.resolve([]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingExams = examRows.filter(
    (row) => String(row.examDate) >= today,
  ).length;
  const completedExams = examRows.filter(
    (row) => String(row.status).toLowerCase() === "completed",
  ).length;

  const gradeItemIds = gradeItems.map((row) => Number(row.id));
  const gradeRows = gradeItemIds.length
    ? await Grade.findAll({
        where: {
          studentId: student.id,
          gradeItemId: gradeItemIds,
        },
      })
    : [];
  const subjectKeyMap: Record<
    string,
    | "math"
    | "science"
    | "english"
    | "filipino"
    | "mapeh"
    | "ap"
    | "tle"
    | "values"
  > = {
    math: "math",
    mathematics: "math",
    science: "science",
    english: "english",
    filipino: "filipino",
    mapeh: "mapeh",
    ap: "ap",
    tle: "tle",
    values: "values",
    esp: "values",
    "aralin panlipunan": "ap",
  };
  const gradeTable = emptyTermGradeTable();
  const scoreByItemId = new Map(
    gradeRows.map((row) => [Number(row.gradeItemId), Number(row.score ?? 0)]),
  );
  const termScores = new Map<string, Map<string, number>>();
  for (const item of gradeItems) {
    const parts = String(item.name ?? "").split("|");
    if (parts.length < 2) continue;
    const termRaw = parts[0]?.trim() || "";
    const subjectRaw = parts[1]?.trim().toLowerCase() || "";
    const term = normalizeAcademicTerm(termRaw);
    const subjectKey = subjectKeyMap[subjectRaw];
    if (!term || !subjectKey) continue;
    const targetRow = gradeTable.find((row) => row.term === term);
    if (!targetRow) continue;
    const score = scoreByItemId.get(Number(item.id));
    if (score === undefined) continue;
    targetRow[subjectKey] = score;
    const subjectScores =
      termScores.get(subjectKey) ?? new Map<string, number>();
    subjectScores.set(term, score);
    termScores.set(subjectKey, subjectScores);
  }
  const publishedCount = gradeRows.length;
  const gradeAverage = publishedCount
    ? Math.round(
        gradeRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) /
          publishedCount,
      )
    : 0;
  const finalSubjectAverages: Record<string, number> = {};
  const finalCandidates: Array<number | null> = [];
  for (const [subject, scores] of termScores) {
    const values = [
      scores.get("Term 1"),
      scores.get("Term 2"),
      scores.get("Term 3"),
    ];
    const average = calculateFinalSubjectAverage(values);
    finalCandidates.push(average);
    if (average !== null) finalSubjectAverages[subject] = average;
  }
  const overallAverage = calculateOverallStudentAverage(finalCandidates);

  return {
    linkedStudent: {
      id: Number(student.id),
      name: `${student.firstName} ${student.lastName}`.trim(),
      gradeLevel: student.yearLevel ?? null,
      sectionId: student.sectionId ?? null,
    },
    attendance: { present, late, absent, rate: attendanceRate },
    quizzes: { submitted: quizSubmitted, averageScore: quizAverage },
    exams: { upcoming: upcomingExams, completed: completedExams },
    grades: {
      average: gradeAverage,
      publishedCount,
      finalSubjectAverages,
      overallAverage,
    },
    gradeTable,
  };
}

export async function updateParent(id: string, data: UpdateParentInput) {
  const parent = await Parent.findByPk(id);
  if (!parent) return null;
  await parent.update({
    firstName: data.firstName ?? parent.firstName,
    lastName: data.lastName ?? parent.lastName,
    phone: data.phone ?? parent.phone,
    studentId: data.studentId ?? parent.studentId,
  });
  if (data.studentId) {
    await ParentStudent.findOrCreate({
      where: { parentId: parent.id, studentId: Number(data.studentId) },
      defaults: { parentId: parent.id, studentId: Number(data.studentId) },
    });
  }
  return parent;
}

export async function deleteParent(id: string) {
  const parent = await Parent.findByPk(id);
  if (!parent) return false;
  await parent.destroy();
  return true;
}
