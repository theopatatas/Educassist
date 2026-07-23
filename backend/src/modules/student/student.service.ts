import bcrypt from "bcryptjs";
import { Op, type Transaction } from "sequelize";
import { sequelize } from "../../config/db";
import { Attendance } from "../../db/models/Attendance.model";
import { calculateAttendancePercentage } from "../../utils/calculations";
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
  studentMobileNumber?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate?: string;
  gender?: string;
  guardianContact?: string;
  guardianName?: string;
  motherName?: string;
  fatherName?: string;
  yearLevel?: string;
  section?: string;
  sectionId?: number;
};

export type UpdateStudentInput = {
  email?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  guardianContact?: string | null;
  guardianName?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  studentMobileNumber?: string | null;
  yearLevel?: string | null;
  section?: string | null;
  sectionId?: number | null;
  isActive?: boolean;
  archived?: boolean;
};

async function ensureGuardianAccountForStudent(
  input: {
    guardianContact?: string | null;
    guardianName?: string | null;
    motherName?: string | null;
    fatherName?: string | null;
    firstName: string;
    lastName: string;
  },
  studentId: number,
  transaction: Transaction,
) {
  const guardianContact = input.guardianContact?.trim();
  if (!guardianContact) return;
  const guardianFullName =
    input.guardianName?.trim() ||
    input.motherName?.trim() ||
    input.fatherName?.trim();
  const nameParts = guardianFullName?.split(/\s+/).filter(Boolean) ?? [];
  const guardianFirstName =
    nameParts.length > 1
      ? nameParts.slice(0, -1).join(" ")
      : nameParts[0] || `Guardian of ${input.firstName}`;
  const guardianLastName =
    nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  const existingParent = await Parent.findOne({
    where: { phone: guardianContact },
    transaction,
  });
  if (existingParent) {
    if (
      !existingParent.studentId ||
      existingParent.firstName.startsWith("Guardian of ")
    ) {
      await existingParent.update(
        {
          studentId: existingParent.studentId ?? studentId,
          firstName: guardianFirstName,
          lastName: guardianLastName,
        },
        { transaction },
      );
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
    { transaction },
  );

  await Parent.create(
    {
      userId: guardianUser.id,
      firstName: guardianFirstName,
      lastName: guardianLastName,
      phone: guardianContact,
      studentId,
    },
    { transaction },
  );
}

export async function createStudent(input: CreateStudentInput) {
  return sequelize.transaction(async (t) => {
    if (
      !input.studentMobileNumber ||
      !/^\d{11}$/.test(input.studentMobileNumber)
    ) {
      return {
        ok: false as const,
        code: 400 as const,
        message:
          "Student mobile number is required and must contain exactly 11 digits",
      };
    }
    if (input.guardianContact && !/^\d{11}$/.test(input.guardianContact)) {
      return {
        ok: false as const,
        code: 400 as const,
        message: "Guardian number must contain exactly 11 digits",
      };
    }
    const nameValues = [
      input.firstName,
      input.middleName,
      input.lastName,
      input.guardianName,
      input.motherName,
      input.fatherName,
    ].filter(Boolean) as string[];
    if (nameValues.some((name) => !/^[\p{L} ]+$/u.test(name.trim()))) {
      return {
        ok: false as const,
        code: 400 as const,
        message: "Names may contain letters and spaces only",
      };
    }
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
        role: "student",
        refreshTokenHash: null,
      },
      { transaction: t },
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
        studentMobileNumber: input.studentMobileNumber || null,
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName ?? null,
        birthDate: input.birthDate ?? null,
        gender: input.gender ?? null,
        guardianContact: input.guardianContact ?? null,
        guardianName: input.guardianName?.trim() || null,
        motherName: input.motherName?.trim() || null,
        fatherName: input.fatherName?.trim() || null,
        yearLevel: input.yearLevel ?? null,
        sectionId: resolvedSectionId,
      },
      { transaction: t },
    );
    await ensureGuardianAccountForStudent(
      {
        guardianContact: input.guardianContact,
        guardianName: input.guardianName,
        motherName: input.motherName,
        fatherName: input.fatherName,
        firstName: input.firstName,
        lastName: input.lastName,
      },
      Number(student.id),
      t,
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
  const [users, sections, parents] = await Promise.all([
    userIds.length
      ? User.findAll({
          where: { id: userIds },
          attributes: ["id", "email", "isActive"],
        })
      : Promise.resolve([]),
    sectionIds.length
      ? Section.findAll({
          where: { id: sectionIds },
          attributes: ["id", "name"],
        })
      : Promise.resolve([]),
    Parent.findAll({
      where: { studentId: students.map((student) => Number(student.id)) },
      attributes: [
        "id",
        "userId",
        "studentId",
        "firstName",
        "lastName",
        "phone",
      ],
    }),
  ]);
  const userEmailById = new Map(users.map((u) => [Number(u.id), u.email]));
  const userActiveById = new Map(
    users.map((u) => [Number(u.id), Boolean(u.isActive)]),
  );
  const sectionNameById = new Map(sections.map((s) => [Number(s.id), s.name]));
  const parentByStudentId = new Map(
    parents.map((parent) => [Number(parent.studentId), parent.toJSON()]),
  );

  return students.map((student) => {
    const raw = student.toJSON() as Record<string, unknown>;
    return {
      ...raw,
      email: userEmailById.get(Number(student.userId)) ?? null,
      isActive: userActiveById.get(Number(student.userId)) ?? false,
      sectionName: student.sectionId
        ? (sectionNameById.get(Number(student.sectionId)) ?? null)
        : null,
      parent: parentByStudentId.get(Number(student.id)) ?? null,
    };
  });
}

export async function getStudentDetailsById(id: string) {
  const student = await Student.findByPk(id);
  if (!student) return null;
  const [user, section, parent] = await Promise.all([
    User.findByPk(student.userId, { attributes: ["id", "email", "isActive"] }),
    student.sectionId
      ? Section.findByPk(student.sectionId, { attributes: ["id", "name"] })
      : null,
    Parent.findOne({ where: { studentId: student.id } }),
  ]);
  return {
    ...student.toJSON(),
    email: user?.email ?? null,
    isActive: user?.isActive ?? false,
    sectionName: section?.name ?? null,
    parent: parent?.toJSON() ?? null,
  };
}

export async function getStudentAcademicRecordById(id: string) {
  const student = await Student.findByPk(id);
  if (!student) return null;
  const classes =
    student.sectionId && student.yearLevel
      ? await Class.findAll({
          where: {
            sectionId: student.sectionId,
            gradeLevel: student.yearLevel,
          },
        })
      : [];
  const classIds = classes.map((row) => Number(row.id));
  const subjectIds = classes
    .map((row) => Number(row.subjectId))
    .filter(Boolean);
  const [subjects, items] = await Promise.all([
    subjectIds.length
      ? Subject.findAll({
          where: { id: subjectIds },
          attributes: ["id", "name", "code"],
        })
      : [],
    classIds.length
      ? GradeItem.findAll({
          where: { classId: classIds, name: { [Op.like]: "%|published" } },
        })
      : [],
  ]);
  const grades = items.length
    ? await Grade.findAll({
        where: {
          studentId: student.id,
          gradeItemId: items.map((item) => Number(item.id)),
        },
      })
    : [];
  const subjectById = new Map(
    subjects.map((subject) => [Number(subject.id), subject]),
  );
  const classById = new Map(classes.map((row) => [Number(row.id), row]));
  const scoreByItemId = new Map(
    grades.map((grade) => [Number(grade.gradeItemId), Number(grade.score)]),
  );
  const records = new Map<
    number,
    {
      subjectId: number;
      subjectName: string;
      subjectCode: string | null;
      quarter1: number | null;
      quarter2: number | null;
      quarter3: number | null;
      quarter4: number | null;
      finalGrade: number | null;
    }
  >();
  for (const subject of subjects) {
    records.set(Number(subject.id), {
      subjectId: Number(subject.id),
      subjectName: subject.name,
      subjectCode: subject.code ?? null,
      quarter1: null,
      quarter2: null,
      quarter3: null,
      quarter4: null,
      finalGrade: null,
    });
  }
  for (const item of items) {
    const cls = classById.get(Number(item.classId));
    const subject = cls ? subjectById.get(Number(cls.subjectId)) : undefined;
    if (!subject) continue;
    const score = scoreByItemId.get(Number(item.id));
    if (score === undefined) continue;
    const term = String(item.name).split("|")[0]?.trim() ?? "";
    const record = records.get(Number(subject.id));
    if (!record) continue;
    if (term.startsWith("1")) record.quarter1 = score;
    else if (term.startsWith("2")) record.quarter2 = score;
    else if (term.startsWith("3")) record.quarter3 = score;
    else if (term.startsWith("4")) record.quarter4 = score;
    else if (/final/i.test(term)) record.finalGrade = score;
  }
  return { subjects: Array.from(records.values()) };
}

export async function getStudentAttendanceHistoryById(id: string) {
  const student = await Student.findByPk(id);
  if (!student) return null;
  const rows = await Attendance.findAll({
    where: { studentId: student.id },
    order: [["date", "DESC"]],
  });
  const classIds = rows.map((row) => Number(row.classId));
  const classes = classIds.length
    ? await Class.findAll({ where: { id: classIds } })
    : [];
  const subjectIds = classes
    .map((row) => Number(row.subjectId))
    .filter(Boolean);
  const subjects = subjectIds.length
    ? await Subject.findAll({
        where: { id: subjectIds },
        attributes: ["id", "name"],
      })
    : [];
  const classById = new Map(classes.map((row) => [Number(row.id), row]));
  const subjectById = new Map(
    subjects.map((row) => [Number(row.id), row.name]),
  );
  return rows.map((row) => {
    const cls = classById.get(Number(row.classId));
    return {
      id: Number(row.id),
      date: row.date,
      status: row.status,
      subject: cls?.subjectId
        ? (subjectById.get(Number(cls.subjectId)) ?? null)
        : null,
      recordedBy: null,
    };
  });
}

export async function getStudentById(id: string) {
  return Student.findByPk(id);
}

export async function getStudentByUserId(userId: string) {
  return Student.findOne({ where: { userId } });
}

type SubjectKey =
  | "math"
  | "science"
  | "english"
  | "filipino"
  | "mapeh"
  | "ap"
  | "tle"
  | "values";

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

  const present = attendanceRows.filter(
    (row) => row.status === "present",
  ).length;
  const late = attendanceRows.filter((row) => row.status === "late").length;
  const absent = attendanceRows.filter((row) => row.status === "absent").length;
  const attendanceRate = calculateAttendancePercentage(
    present,
    attendanceRows.length,
  );

  const classIds = classes.map((row) => Number(row.id));
  const subjectIds = classes
    .map((row) => Number(row.subjectId))
    .filter(Boolean);
  const [subjects, gradeItems] = await Promise.all([
    subjectIds.length
      ? Subject.findAll({
          where: { id: subjectIds },
          attributes: ["id", "name"],
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
    {
      quarter: "Quarter 1",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
    {
      quarter: "Quarter 2",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
    {
      quarter: "Quarter 3",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
    {
      quarter: "Quarter 4",
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    },
  ];
  const scoreByItemId = new Map(
    gradeRows.map((row) => [Number(row.gradeItemId), Number(row.score ?? 0)]),
  );
  const labelsFromGrades = new Set<string>();

  for (const item of gradeItems) {
    const parts = String(item.name ?? "").split("|");
    if (parts.length < 2) continue;
    const termRaw = parts[0]?.trim() || "";
    const subjectRaw = normalizeText(parts[1]);
    const quarter = termRaw.startsWith("1")
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

  const subjectsList = Array.from(
    new Set([...labelsFromClasses, ...labelsFromGrades]),
  ).sort((a, b) => a.localeCompare(b));

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
  let sectionId = student.sectionId;
  if (data.sectionId !== undefined) sectionId = data.sectionId;
  else if (data.section !== undefined) {
    const sectionName = data.section?.trim();
    if (!sectionName) sectionId = null;
    else {
      const [section] = await Section.findOrCreate({
        where: { name: sectionName },
        defaults: { name: sectionName },
      });
      sectionId = Number(section.id);
    }
  }
  await student.update({
    firstName: data.firstName ?? student.firstName,
    lastName: data.lastName ?? student.lastName,
    middleName: data.middleName ?? student.middleName,
    birthDate: data.birthDate ?? student.birthDate,
    gender: data.gender ?? student.gender,
    guardianContact: data.guardianContact ?? student.guardianContact,
    guardianName: data.guardianName ?? student.guardianName,
    motherName: data.motherName ?? student.motherName,
    fatherName: data.fatherName ?? student.fatherName,
    studentMobileNumber:
      data.studentMobileNumber ?? student.studentMobileNumber,
    yearLevel: data.yearLevel ?? student.yearLevel,
    sectionId,
    archivedAt:
      data.archived === undefined
        ? student.archivedAt
        : data.archived
          ? new Date()
          : null,
  });
  const user = await User.findByPk(student.userId);
  if (
    user &&
    (data.email !== undefined ||
      data.isActive !== undefined ||
      data.archived !== undefined)
  ) {
    await user.update({
      email: data.email?.trim().toLowerCase() ?? user.email,
      isActive: data.archived ? false : (data.isActive ?? user.isActive),
      refreshTokenHash:
        data.isActive === false || data.archived ? null : user.refreshTokenHash,
    });
  }
  const parent = await Parent.findOne({ where: { studentId: student.id } });
  if (
    parent &&
    (data.guardianName !== undefined || data.guardianContact !== undefined)
  ) {
    const parts = data.guardianName?.trim().split(/\s+/).filter(Boolean) ?? [];
    await parent.update({
      firstName:
        parts.length > 1
          ? parts.slice(0, -1).join(" ")
          : (parts[0] ?? parent.firstName),
      lastName: parts.length > 1 ? parts[parts.length - 1] : parent.lastName,
      phone: data.guardianContact ?? parent.phone,
    });
  }
  return getStudentDetailsById(id);
}

export async function promoteStudent(id: string) {
  const student = await Student.findByPk(id);
  if (!student) {
    return {
      ok: false as const,
      code: 404 as const,
      message: "Student not found",
    };
  }
  if (student.archivedAt) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "Archived students cannot be promoted",
    };
  }
  if (student.graduatedAt) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "This student is already marked as graduated",
    };
  }

  const gradeMatch = String(student.yearLevel ?? "").match(/grade\s*(\d+)/i);
  const currentGrade = gradeMatch ? Number(gradeMatch[1]) : Number.NaN;
  if (
    !Number.isInteger(currentGrade) ||
    currentGrade < 1 ||
    currentGrade > 12
  ) {
    return {
      ok: false as const,
      code: 400 as const,
      message:
        "The student's current grade level cannot be promoted automatically",
    };
  }

  const previousGradeLevel = student.yearLevel;
  if (currentGrade === 12) {
    const graduatedAt = new Date();
    await student.update({
      previousGradeLevel,
      promotedAt: graduatedAt,
      graduatedAt,
    });
    const user = await User.findByPk(student.userId);
    if (user) {
      await user.update({ isActive: true });
    }
    return {
      ok: true as const,
      student,
      previousGradeLevel,
      nextGradeLevel: "Graduated",
      graduated: true,
    };
  }
  const nextGradeLevel = `Grade ${currentGrade + 1}`;
  await student.update({
    yearLevel: nextGradeLevel,
    previousGradeLevel,
    promotedAt: new Date(),
  });
  return {
    ok: true as const,
    student,
    previousGradeLevel,
    nextGradeLevel,
  };
}

export async function undoStudentPromotion(id: string) {
  const student = await Student.findByPk(id);
  if (!student) {
    return {
      ok: false as const,
      code: 404 as const,
      message: "Student not found",
    };
  }
  if (!student.previousGradeLevel || !student.promotedAt) {
    return {
      ok: false as const,
      code: 400 as const,
      message: "This student has no promotion to undo",
    };
  }

  const restoredGradeLevel = student.previousGradeLevel;
  const wasGraduated = Boolean(student.graduatedAt);
  const promotedGradeLevel = wasGraduated ? "Graduated" : student.yearLevel;
  await student.update({
    yearLevel: restoredGradeLevel,
    previousGradeLevel: null,
    promotedAt: null,
    graduatedAt: null,
  });
  if (wasGraduated) {
    const user = await User.findByPk(student.userId);
    if (user) await user.update({ isActive: true });
  }
  return {
    ok: true as const,
    student,
    promotedGradeLevel,
    restoredGradeLevel,
  };
}

export async function deleteStudent(id: string) {
  const student = await Student.findByPk(id);
  if (!student) return false;
  await student.destroy();
  return true;
}
