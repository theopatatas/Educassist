import bcrypt from "bcryptjs";
import { Op, type Transaction } from "sequelize";
import { sequelize } from "../../config/db";
import { Attendance } from "../../db/models/Attendance.model";
import { Class } from "../../db/models/Class.model";
import { Grade } from "../../db/models/Grade.model";
import { GradeItem } from "../../db/models/GradeItem.model";
import { Parent } from "../../db/models/Parent.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { Subject } from "../../db/models/Subject.model";
import { User } from "../../db/models/User.model";

export type CreateStudentInput = {
  email: string;
  password: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  gender?: string;
  guardianContact?: string;
  yearLevel?: string;
  section?: string;
  sectionId?: number;
};

export type UpdateStudentInput = {
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  guardianContact?: string | null;
};

async function ensureGuardianAccountForStudent(
  input: { guardianContact?: string | null; firstName: string; lastName: string },
  studentId: number,
  transaction: Transaction
) {
  const guardianContact = input.guardianContact?.trim();
  if (!guardianContact) return;

  const existingParent = await Parent.findOne({ where: { phone: guardianContact }, transaction });
  if (existingParent) {
    if (!existingParent.studentId) {
      await existingParent.update({ studentId }, { transaction });
    }
    return;
  }

  let loginId = guardianContact;
  let suffix = 1;
  while (await User.findOne({ where: { email: loginId }, transaction })) {
    suffix += 1;
    loginId = `${guardianContact}_${suffix}`;
  }

  const passwordHash = await bcrypt.hash("12345678", 10);
  const guardianUser = await User.create(
    {
      email: loginId,
      passwordHash,
      role: "parent",
      refreshTokenHash: null,
    },
    { transaction }
  );

  await Parent.create(
    {
      userId: guardianUser.id,
      firstName: `Guardian of ${input.firstName}`,
      lastName: input.lastName,
      phone: guardianContact,
      studentId,
    },
    { transaction }
  );
}

export async function createStudent(input: CreateStudentInput) {
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
        role: "student",
        refreshTokenHash: null,
      },
      { transaction: t }
    );

    let resolvedSectionId: number | null = null;
    if (input.sectionId) {
      resolvedSectionId = Number(input.sectionId);
    } else if (input.section?.trim()) {
      const sectionName = input.section.trim();
      const [section] = await Section.findOrCreate({
        where: { name: sectionName },
        defaults: { name: sectionName },
        transaction: t,
      });
      resolvedSectionId = Number(section.id);
    }

    const student = await Student.create(
      {
        userId: user.id,
        lrn: input.lrn,
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName ?? null,
        birthDate: input.birthDate ?? null,
        gender: input.gender ?? null,
        guardianContact: input.guardianContact ?? null,
        yearLevel: input.yearLevel ?? null,
        sectionId: resolvedSectionId,
      },
      { transaction: t }
    );
    await ensureGuardianAccountForStudent(
      {
        guardianContact: input.guardianContact,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      Number(student.id),
      t
    );

    return {
      ok: true as const,
      student,
      user: { id: user.id, email: user.email, role: user.role },
    };
  });
}

export async function listStudents() {
  const students = await Student.findAll({ order: [["createdAt", "DESC"]] });
  if (students.length === 0) return [];

  const userIds = students.map((s) => Number(s.userId)).filter(Boolean);
  const sectionIds = students.map((s) => Number(s.sectionId)).filter(Boolean);
  const [users, sections] = await Promise.all([
    userIds.length ? User.findAll({ where: { id: userIds }, attributes: ["id", "email"] }) : Promise.resolve([]),
    sectionIds.length ? Section.findAll({ where: { id: sectionIds }, attributes: ["id", "name"] }) : Promise.resolve([]),
  ]);
  const userEmailById = new Map(users.map((u) => [Number(u.id), u.email]));
  const sectionNameById = new Map(sections.map((s) => [Number(s.id), s.name]));

  return students.map((student) => {
    const raw = student.toJSON() as Record<string, unknown>;
    return {
      ...raw,
      email: userEmailById.get(Number(student.userId)) ?? null,
      sectionName: student.sectionId ? sectionNameById.get(Number(student.sectionId)) ?? null : null,
    };
  });
}

export async function getStudentById(id: string) {
  return Student.findByPk(id);
}

export async function getStudentByUserId(userId: string) {
  return Student.findOne({ where: { userId } });
}

type SubjectKey = "math" | "science" | "english" | "filipino" | "mapeh" | "ap" | "tle" | "values";

const SUBJECT_KEY_MAP: Record<string, SubjectKey> = {
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

const SUBJECT_LABEL_BY_KEY: Record<SubjectKey, string> = {
  math: "Math",
  science: "Science",
  english: "English",
  filipino: "Filipino",
  mapeh: "MAPEH",
  ap: "AP",
  tle: "TLE",
  values: "Values",
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function getStudentOverviewById(id: string) {
  const student = await Student.findByPk(id);
  if (!student) return null;

  const [attendanceRows, classes] = await Promise.all([
    Attendance.findAll({ where: { studentId: student.id } }),
    student.sectionId && student.yearLevel
      ? Class.findAll({
          where: {
            sectionId: student.sectionId,
            gradeLevel: student.yearLevel,
          },
          attributes: ["id", "subjectId"],
        })
      : Promise.resolve([]),
  ]);

  const present = attendanceRows.filter((row) => row.status === "present").length;
  const late = attendanceRows.filter((row) => row.status === "late").length;
  const absent = attendanceRows.filter((row) => row.status === "absent").length;
  const attendanceRate = attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : 0;

  const classIds = classes.map((row) => Number(row.id));
  const subjectIds = classes.map((row) => Number(row.subjectId)).filter(Boolean);
  const [subjects, gradeItems] = await Promise.all([
    subjectIds.length ? Subject.findAll({ where: { id: subjectIds }, attributes: ["id", "name"] }) : Promise.resolve([]),
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

  const subjectById = new Map(subjects.map((s) => [Number(s.id), s.name]));
  const labelsFromClasses = new Set<string>();
  for (const cls of classes) {
    const name = subjectById.get(Number(cls.subjectId));
    const normalized = normalizeText(name);
    const subjectKey = SUBJECT_KEY_MAP[normalized];
    if (subjectKey) labelsFromClasses.add(SUBJECT_LABEL_BY_KEY[subjectKey]);
    else if (name) labelsFromClasses.add(name);
  }

  const gradeItemIds = gradeItems.map((row) => Number(row.id));
  const gradeRows = gradeItemIds.length
    ? await Grade.findAll({
        where: {
          studentId: student.id,
          gradeItemId: gradeItemIds,
        },
      })
    : [];

  const gradeTable = [
    { quarter: "Quarter 1", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 2", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 3", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
    { quarter: "Quarter 4", math: 0, science: 0, english: 0, filipino: 0, mapeh: 0, ap: 0, tle: 0, values: 0 },
  ];
  const scoreByItemId = new Map(gradeRows.map((row) => [Number(row.gradeItemId), Number(row.score ?? 0)]));
  const labelsFromGrades = new Set<string>();

  for (const item of gradeItems) {
    const parts = String(item.name ?? "").split("|");
    if (parts.length < 2) continue;
    const termRaw = parts[0]?.trim() || "";
    const subjectRaw = normalizeText(parts[1]);
    const quarter =
      termRaw.startsWith("1")
        ? "Quarter 1"
        : termRaw.startsWith("2")
          ? "Quarter 2"
          : termRaw.startsWith("3")
            ? "Quarter 3"
            : termRaw.startsWith("4")
              ? "Quarter 4"
              : "";
    const subjectKey = SUBJECT_KEY_MAP[subjectRaw];
    if (!quarter || !subjectKey) continue;
    const targetRow = gradeTable.find((row) => row.quarter === quarter);
    if (!targetRow) continue;
    targetRow[subjectKey] = scoreByItemId.get(Number(item.id)) ?? 0;
    labelsFromGrades.add(SUBJECT_LABEL_BY_KEY[subjectKey]);
  }

  const subjectsList = Array.from(new Set([...labelsFromClasses, ...labelsFromGrades])).sort((a, b) =>
    a.localeCompare(b)
  );

  return {
    student: {
      id: Number(student.id),
      name: `${student.firstName} ${student.lastName}`.trim(),
      gradeLevel: student.yearLevel ?? null,
      sectionId: student.sectionId ?? null,
    },
    attendance: { present, late, absent, rate: attendanceRate },
    subjects: subjectsList,
    gradeTable,
  };
}

export async function updateStudent(id: string, data: UpdateStudentInput) {
  const student = await Student.findByPk(id);
  if (!student) return null;
  await student.update({
    firstName: data.firstName ?? student.firstName,
    lastName: data.lastName ?? student.lastName,
    middleName: data.middleName ?? student.middleName,
    birthDate: data.birthDate ?? student.birthDate,
    gender: data.gender ?? student.gender,
    guardianContact: data.guardianContact ?? student.guardianContact,
  });
  return student;
}

export async function deleteStudent(id: string) {
  const student = await Student.findByPk(id);
  if (!student) return false;
  await student.destroy();
  return true;
}
