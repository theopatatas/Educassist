import bcrypt from "bcryptjs";
import { sequelize } from "../../config/db";
import { Class } from "../../db/models/Class.model";
import { Section } from "../../db/models/Section.model";
import { Subject } from "../../db/models/Subject.model";
import { Teacher } from "../../db/models/Teacher.model";
import { User } from "../../db/models/User.model";

export type CreateTeacherInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  gradeLevel?: string;
  sectionId?: string | number;
};

export type UpdateTeacherInput = {
  firstName?: string;
  lastName?: string;
  employeeNumber?: string | null;
};

export async function createTeacher(input: CreateTeacherInput) {
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
        role: "TEACHER",
        refreshTokenHash: null,
      },
      { transaction: t }
    );

    const teacher = await Teacher.create(
      {
        userId: user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        employeeNumber: input.employeeNumber,
        gradeLevel: input.gradeLevel ?? null,
        sectionId: input.sectionId ? Number(input.sectionId) : null,
      },
      { transaction: t }
    );

    return {
      ok: true as const,
      teacher,
      user: { id: user.id, email: user.email, role: user.role },
    };
  });
}

export async function listTeachers() {
  const teachers = await Teacher.findAll({ order: [["createdAt", "DESC"]] });
  if (teachers.length === 0) return [];

  const userIds = teachers.map((t) => Number(t.userId)).filter(Boolean);
  const sectionIds = teachers.map((t) => Number(t.sectionId)).filter(Boolean);
  const [users, sections] = await Promise.all([
    userIds.length ? User.findAll({ where: { id: userIds }, attributes: ["id", "email"] }) : Promise.resolve([]),
    sectionIds.length ? Section.findAll({ where: { id: sectionIds }, attributes: ["id", "name"] }) : Promise.resolve([]),
  ]);
  const userEmailById = new Map(users.map((u) => [Number(u.id), u.email]));
  const sectionNameById = new Map(sections.map((s) => [Number(s.id), s.name]));

  return teachers.map((teacher) => {
    const raw = teacher.toJSON() as Record<string, unknown>;
    return {
      ...raw,
      email: userEmailById.get(Number(teacher.userId)) ?? null,
      sectionName: teacher.sectionId ? sectionNameById.get(Number(teacher.sectionId)) ?? null : null,
    };
  });
}

export async function getTeacherById(id: string) {
  return Teacher.findByPk(id);
}

export async function getTeacherByUserId(userId: string) {
  return Teacher.findOne({ where: { userId } });
}

export async function updateTeacher(id: string, data: UpdateTeacherInput) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) return null;
  await teacher.update({
    firstName: data.firstName ?? teacher.firstName,
    lastName: data.lastName ?? teacher.lastName,
    employeeNumber: data.employeeNumber ?? teacher.employeeNumber,
  });
  return teacher;
}

export async function deleteTeacher(id: string) {
  const teacher = await Teacher.findByPk(id);
  if (!teacher) return false;
  await teacher.destroy();
  return true;
}

export async function listTeacherSubjects(teacherId: string) {
  const classes = await Class.findAll({ where: { teacherId } });
  const subjectIds = classes.map((c) => c.subjectId).filter(Boolean) as number[];
  if (subjectIds.length === 0) return [];
  return Subject.findAll({ where: { id: subjectIds } });
}

export async function addSubjectForTeacher(
  teacherId: string,
  input: { name: string }
) {
  return sequelize.transaction(async (t) => {
    const teacher = await Teacher.findByPk(teacherId, { transaction: t });
    if (!teacher) return { ok: false as const, code: 404 as const, message: "Teacher not found" };

    const normalizedName = input.name.trim();
    const existingSubject = await Subject.findOne({ where: { name: normalizedName }, transaction: t });
    const subject = existingSubject ?? (await Subject.create({ name: normalizedName, code: null }, { transaction: t }));

    await Class.create(
      {
        teacherId: teacher.id,
        subjectId: subject.id,
        sectionId: null,
        name: subject.name,
      },
      { transaction: t }
    );

    return { ok: true as const, subject };
  });
}

export async function addTeachingLoadForTeacher(
  userId: string,
  entries: Array<{ subject: string; gradeLevel: string; section: string }>
) {
  return sequelize.transaction(async (t) => {
    const teacher = await Teacher.findOne({ where: { userId }, transaction: t });
    if (!teacher) return { ok: false as const, code: 404 as const, message: "Teacher not found" };

    for (const entry of entries) {
      if (!entry.subject || !entry.gradeLevel || !entry.section) {
        return { ok: false as const, code: 400 as const, message: "All fields are required" };
      }

      const normalizedSubject = entry.subject.trim();
      const existingSubject = await Subject.findOne({
        where: { name: normalizedSubject },
        transaction: t,
      });
      const subject =
        existingSubject ??
        (await Subject.create(
          { name: normalizedSubject, code: null },
          { transaction: t }
        ));

      const existingSection = await Section.findOne({
        where: { name: entry.section },
        transaction: t,
      });
      const section =
        existingSection ?? (await Section.create({ name: entry.section }, { transaction: t }));

      await Class.create(
        {
          teacherId: teacher.id,
          subjectId: subject.id,
          sectionId: section.id,
          gradeLevel: entry.gradeLevel,
          name: subject.name,
        },
        { transaction: t }
      );
    }

    return { ok: true as const };
  });
}
