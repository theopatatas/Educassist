import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import { sequelize } from "../../config/db";
import { Attendance } from "../../db/models/Attendance.model";
import { Class } from "../../db/models/Class.model";
import { Exam } from "../../db/models/Exam.model";
import { Grade } from "../../db/models/Grade.model";
import { GradeItem } from "../../db/models/GradeItem.model";
import { Parent } from "../../db/models/Parent.model";
import { QuizAttempt } from "../../db/models/QuizAttempt.model";
import { Student } from "../../db/models/Student.model";
import { User } from "../../db/models/User.model";

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
    const existing = await User.findOne({ where: { email: input.email }, transaction: t });
    if (existing) {
      return { ok: false as const, code: 409 as const, message: "Email already in use" };
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await User.create(
      {
        email: input.email,
        passwordHash,
        role: "parent",
        refreshTokenHash: null,
      },
      { transaction: t }
    );

    const parent = await Parent.create(
      {
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        studentId: input.studentId ?? null,
      },
      { transaction: t }
    );

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

export async function getParentOverviewByUserId(userId: string) {
  const parent = await Parent.findOne({ where: { userId } });
  if (!parent) return null;
  if (!parent.studentId) {
    return {
      linkedStudent: null,
      attendance: { present: 0, late: 0, absent: 0, rate: 0 },
      quizzes: { submitted: 0, averageScore: 0 },
      exams: { upcoming: 0, completed: 0 },
      grades: { average: 0, publishedCount: 0 },
      gradeTable: [
        { quarter: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { quarter: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { quarter: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { quarter: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
      ],
    };
  }

  const student = await Student.findByPk(parent.studentId);
  if (!student) {
    return {
      linkedStudent: null,
      attendance: { present: 0, late: 0, absent: 0, rate: 0 },
      quizzes: { submitted: 0, averageScore: 0 },
      exams: { upcoming: 0, completed: 0 },
      grades: { average: 0, publishedCount: 0 },
      gradeTable: [
        { quarter: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { quarter: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { quarter: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
        { quarter: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
      ],
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

  const present = attendanceRows.filter((row) => row.status === "present").length;
  const late = attendanceRows.filter((row) => row.status === "late").length;
  const absent = attendanceRows.filter((row) => row.status === "absent").length;
  const attendanceRate = attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : 0;

  const quizSubmitted = quizAttempts.length;
  const quizAverage = quizSubmitted
    ? Math.round(quizAttempts.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / quizSubmitted)
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
            name: { [Op.like]: "%|published" },
          },
          attributes: ["id", "name"],
        })
      : Promise.resolve([]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingExams = examRows.filter((row) => String(row.examDate) >= today).length;
  const completedExams = examRows.filter((row) => String(row.status).toLowerCase() === "completed").length;

  const gradeItemIds = gradeItems.map((row) => Number(row.id));
  const gradeRows = gradeItemIds.length
    ? await Grade.findAll({
        where: {
          studentId: student.id,
          gradeItemId: gradeItemIds,
        },
      })
    : [];
  const subjectKeyMap: Record<string, "math" | "science" | "english" | "filipino" | "mapeh" | "ap" | "tle" | "values"> = {
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
  const gradeTable = [
    { quarter: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
  ];
  const scoreByItemId = new Map(gradeRows.map((row) => [Number(row.gradeItemId), Number(row.score ?? 0)]));
  for (const item of gradeItems) {
    const parts = String(item.name ?? "").split("|");
    if (parts.length < 2) continue;
    const termRaw = parts[0]?.trim() || "";
    const subjectRaw = parts[1]?.trim().toLowerCase() || "";
    const quarter =
      termRaw.startsWith("1") ? "Quarter 1" : termRaw.startsWith("2") ? "Quarter 2" : termRaw.startsWith("3") ? "Quarter 3" : termRaw.startsWith("4") ? "Quarter 4" : "";
    const subjectKey = subjectKeyMap[subjectRaw];
    if (!quarter || !subjectKey) continue;
    const targetRow = gradeTable.find((row) => row.quarter === quarter);
    if (!targetRow) continue;
    targetRow[subjectKey] = scoreByItemId.get(Number(item.id)) ?? 0;
  }
  const publishedCount = gradeRows.length;
  const gradeAverage = publishedCount
    ? Math.round(gradeRows.reduce((sum, row) => sum + Number(row.score ?? 0), 0) / publishedCount)
    : 0;

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
    grades: { average: gradeAverage, publishedCount },
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
  return parent;
}

export async function deleteParent(id: string) {
  const parent = await Parent.findByPk(id);
  if (!parent) return false;
  await parent.destroy();
  return true;
}
