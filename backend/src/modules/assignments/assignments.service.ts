import { Assignment } from "../../db/models/Assignment.model";
import { AssignmentSubmission } from "../../db/models/AssignmentSubmission.model";
import { Class } from "../../db/models/Class.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { Subject } from "../../db/models/Subject.model";
import { Teacher } from "../../db/models/Teacher.model";

type AssignmentStatus = "Active" | "Closed";

export type CreateAssignmentInput = {
  classId?: number;
  title?: string;
  dueDate?: string;
  description?: string;
  status?: AssignmentStatus;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function enrollmentKey(sectionId: unknown, yearLevel: unknown) {
  return `${Number(sectionId ?? 0)}|${normalizeText(yearLevel)}`;
}

function colorForSubject(subjectName?: string | null) {
  const s = normalizeText(subjectName);
  if (s.includes("science")) return "green";
  if (s.includes("math")) return "blue";
  if (s.includes("english")) return "purple";
  return "blue";
}

export async function listAssignmentsForTeacher(
  userId: string,
  filter?: { section?: string; gradeLevel?: string }
) {
  const teacher = await Teacher.findOne({ where: { userId } });
  if (!teacher) return null;

  const assignments = await Assignment.findAll({
    where: { teacherId: teacher.id },
    order: [["createdAt", "DESC"]],
  });
  if (assignments.length === 0) return [];

  const classIds = assignments.map((a) => Number(a.classId)).filter(Boolean);
  const [classes, subjects, sections, students] = await Promise.all([
    classIds.length ? Class.findAll({ where: { id: classIds } }) : Promise.resolve([]),
    Subject.findAll(),
    Section.findAll(),
    Student.findAll({ attributes: ["sectionId", "yearLevel"] }),
  ]);
  const assignmentIds = assignments.map((a) => Number(a.id));
  const submissionRows =
    assignmentIds.length > 0
      ? await AssignmentSubmission.findAll({ where: { assignmentId: assignmentIds } })
      : [];

  const classMap = new Map(classes.map((c) => [Number(c.id), c]));
  const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
  const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
  const studentCountMap = new Map<string, number>();
  for (const s of students) {
    const key = enrollmentKey(s.sectionId, s.yearLevel);
    studentCountMap.set(key, (studentCountMap.get(key) ?? 0) + 1);
  }

  const sectionFilter = normalizeText(filter?.section);
  const gradeFilter = normalizeText(filter?.gradeLevel);

  return assignments
    .map((a) => {
      const cls = a.classId ? classMap.get(Number(a.classId)) : null;
      const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
      const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
      const total = cls ? studentCountMap.get(enrollmentKey(cls.sectionId, cls.gradeLevel)) ?? 0 : 0;
      const submitted = submissionRows.filter((s) => Number(s.assignmentId) === Number(a.id) && !!s.submittedAt).length;

      return {
        ...a.toJSON(),
        subjectName,
        sectionName,
        color: colorForSubject(subjectName),
        submissions: { submitted, total },
      };
    })
    .filter((row) => {
      const sectionOk =
        !sectionFilter ||
        sectionFilter === "all sections" ||
        normalizeText(row.sectionName) === sectionFilter;
      const gradeOk =
        !gradeFilter ||
        gradeFilter === "all grade levels" ||
        normalizeText(classMap.get(Number(row.classId))?.gradeLevel) === gradeFilter;
      return sectionOk && gradeOk;
    });
}

export async function listAssignmentsForStudent(userId: string) {
  const student = await Student.findOne({ where: { userId } });
  if (!student) return null;
  if (!student.sectionId || !student.yearLevel) return [];

  const classesBySection = await Class.findAll({ where: { sectionId: student.sectionId } });
  const classes = classesBySection.filter(
    (c) => normalizeText(c.gradeLevel) === normalizeText(student.yearLevel)
  );
  const classIds = classes.map((c) => Number(c.id));
  if (classIds.length === 0) return [];

  const [assignments, subjects, sections, teachers] = await Promise.all([
    Assignment.findAll({ where: { classId: classIds }, order: [["dueDate", "ASC"], ["createdAt", "DESC"]] }),
    Subject.findAll(),
    Section.findAll(),
    Teacher.findAll(),
  ]);
  const assignmentIds = assignments.map((a) => Number(a.id));
  const submissionRows =
    assignmentIds.length > 0
      ? await AssignmentSubmission.findAll({ where: { assignmentId: assignmentIds, studentId: student.id } })
      : [];
  const submissionMap = new Map(submissionRows.map((s) => [Number(s.assignmentId), s]));

  const classMap = new Map(classes.map((c) => [Number(c.id), c]));
  const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
  const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
  const teacherMap = new Map(teachers.map((t) => [Number(t.id), `${t.firstName} ${t.lastName}`.trim()]));

  return assignments.map((a) => {
    const cls = a.classId ? classMap.get(Number(a.classId)) : null;
    const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
    const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
    const teacherName = cls?.teacherId ? teacherMap.get(Number(cls.teacherId)) ?? null : null;
    const mySubmission = submissionMap.get(Number(a.id));

    return {
      ...a.toJSON(),
      subjectName,
      sectionName,
      teacherName,
      color: colorForSubject(subjectName),
      mySubmitted: !!mySubmission?.submittedAt,
    };
  });
}

export async function createAssignmentForTeacher(userId: string, input: CreateAssignmentInput) {
  const teacher = await Teacher.findOne({ where: { userId } });
  if (!teacher) return null;
  if (!input.classId || !input.title?.trim() || !input.dueDate) return false;

  const cls = await Class.findByPk(input.classId);
  if (!cls || cls.teacherId !== teacher.id) return false;

  const assignment = await Assignment.create({
    teacherId: teacher.id,
    classId: cls.id,
    title: input.title.trim().slice(0, 180),
    dueDate: input.dueDate,
    status: input.status || "Active",
    description: input.description?.trim() || null,
  });

  return assignment;
}

export async function submitAssignmentForStudent(userId: string, assignmentId: string) {
  const student = await Student.findOne({ where: { userId } });
  if (!student) return null;

  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment || !assignment.classId) return false;

  const cls = await Class.findByPk(assignment.classId);
  if (!cls || !student.sectionId || !student.yearLevel || !cls.sectionId || !cls.gradeLevel) return false;
  const sectionOk = Number(student.sectionId) === Number(cls.sectionId);
  const levelOk = normalizeText(student.yearLevel) === normalizeText(cls.gradeLevel);
  if (!sectionOk || !levelOk) return false;

  const existing = await AssignmentSubmission.findOne({
    where: { assignmentId: Number(assignment.id), studentId: Number(student.id) },
  });
  if (existing) {
    await existing.update({ submittedAt: existing.submittedAt ?? new Date() });
    return existing;
  }

  return AssignmentSubmission.create({
    assignmentId: Number(assignment.id),
    studentId: Number(student.id),
    submittedAt: new Date(),
  });
}

export async function listAssignmentResultsForTeacher(userId: string, assignmentId: string) {
  const teacher = await Teacher.findOne({ where: { userId } });
  if (!teacher) return null;

  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment || !assignment.classId) return false;

  const cls = await Class.findByPk(assignment.classId);
  if (!cls || cls.teacherId !== teacher.id || !cls.sectionId || !cls.gradeLevel) return false;

  const studentsInSection = await Student.findAll({
    where: { sectionId: cls.sectionId },
    order: [["lastName", "ASC"], ["firstName", "ASC"]],
  });
  const enrolledStudents = studentsInSection.filter(
    (s) => normalizeText(s.yearLevel) === normalizeText(cls.gradeLevel)
  );

  const submissions = await AssignmentSubmission.findAll({
    where: { assignmentId: Number(assignment.id) },
    order: [["updatedAt", "DESC"]],
  });
  const submissionMap = new Map<number, AssignmentSubmission>();
  for (const sub of submissions) {
    submissionMap.set(Number(sub.studentId), sub);
  }

  const rows = enrolledStudents.map((s) => {
    const sub = submissionMap.get(Number(s.id));
    return {
      studentId: Number(s.id),
      studentName: `${s.lastName}, ${s.firstName}`,
      status: sub?.submittedAt ? "Submitted" : "Not Submitted",
      submittedAt: sub?.submittedAt ?? null,
    };
  });

  const submitted = rows.filter((r) => r.status === "Submitted").length;
  const total = rows.length;

  return {
    submitted,
    total,
    rows,
  };
}
