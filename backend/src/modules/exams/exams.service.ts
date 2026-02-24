import { Class } from "../../db/models/Class.model";
import { Exam } from "../../db/models/Exam.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { Subject } from "../../db/models/Subject.model";
import { Teacher } from "../../db/models/Teacher.model";

type ExamStatus = "Scheduled" | "Completed" | "Drafting";
type GradingStatus = "Not Started" | "In Progress" | "Done";

export type CreateExamInput = {
  classId?: number;
  title?: string;
  date?: string;
  startTime?: string;
  duration?: string;
  status?: ExamStatus;
  room?: string;
  coverage?: string[];
};

export type UpdateExamInput = {
  title?: string;
  date?: string;
  startTime?: string;
  duration?: string;
  status?: ExamStatus;
  room?: string;
  coverage?: string[];
  gradingStatus?: GradingStatus;
  publishResults?: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function enrollmentKey(sectionId: unknown, yearLevel: unknown) {
  return `${Number(sectionId ?? 0)}|${normalizeText(yearLevel)}`;
}

function colorForSubject(subjectName?: string | null) {
  const s = normalizeText(subjectName);
  if (s.includes("science")) return "bg-green-500";
  if (s.includes("math")) return "bg-blue-500";
  if (s.includes("english")) return "bg-purple-500";
  if (s.includes("filipino")) return "bg-orange-500";
  return "bg-blue-500";
}

function parseCoverage(input: unknown) {
  if (Array.isArray(input)) return input.map((x) => String(x)).filter(Boolean);
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function listExamsForTeacher(
  userId: string,
  filter?: { section?: string; gradeLevel?: string }
) {
  const teacher = await Teacher.findOne({ where: { userId } });
  if (!teacher) return null;

  const exams = await Exam.findAll({ where: { teacherId: teacher.id }, order: [["createdAt", "DESC"]] });
  if (exams.length === 0) return [];

  const classIds = exams.map((e) => Number(e.classId)).filter(Boolean);
  const [classes, subjects, sections, students] = await Promise.all([
    classIds.length ? Class.findAll({ where: { id: classIds } }) : Promise.resolve([]),
    Subject.findAll(),
    Section.findAll(),
    Student.findAll({ attributes: ["id", "sectionId", "yearLevel"] }),
  ]);

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

  return exams
    .map((e) => {
      const cls = e.classId ? classMap.get(Number(e.classId)) : null;
      const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
      const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
      const total = cls ? studentCountMap.get(enrollmentKey(cls.sectionId, cls.gradeLevel)) ?? 0 : 0;
      return {
        ...e.toJSON(),
        subjectName,
        sectionName,
        color: colorForSubject(subjectName),
        coverage: parseCoverage(e.coverageJson),
        students: total,
        submissions: { submitted: 0, total },
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
        normalizeText(
          classMap.get(Number(row.classId))?.gradeLevel
        ) === gradeFilter;
      return sectionOk && gradeOk;
    });
}

export async function listExamsForStudent(userId: string) {
  const student = await Student.findOne({ where: { userId } });
  if (!student) return null;
  if (!student.sectionId || !student.yearLevel) return [];

  const classesInSection = await Class.findAll({ where: { sectionId: student.sectionId } });
  const classes = classesInSection.filter(
    (c) => normalizeText(c.gradeLevel) === normalizeText(student.yearLevel)
  );
  const classIds = classes.map((c) => Number(c.id));
  if (classIds.length === 0) return [];

  const [exams, subjects, sections, teachers] = await Promise.all([
    Exam.findAll({ where: { classId: classIds }, order: [["examDate", "ASC"], ["createdAt", "DESC"]] }),
    Subject.findAll(),
    Section.findAll(),
    Teacher.findAll(),
  ]);

  const classMap = new Map(classes.map((c) => [Number(c.id), c]));
  const subjectMap = new Map(subjects.map((s) => [Number(s.id), s.name]));
  const sectionMap = new Map(sections.map((s) => [Number(s.id), s.name]));
  const teacherMap = new Map(teachers.map((t) => [Number(t.id), `${t.firstName} ${t.lastName}`.trim()]));

  return exams.map((e) => {
    const cls = e.classId ? classMap.get(Number(e.classId)) : null;
    const subjectName = cls?.subjectId ? subjectMap.get(Number(cls.subjectId)) ?? null : null;
    const sectionName = cls?.sectionId ? sectionMap.get(Number(cls.sectionId)) ?? null : null;
    const teacherName = cls?.teacherId ? teacherMap.get(Number(cls.teacherId)) ?? null : null;
    return {
      ...e.toJSON(),
      subjectName,
      sectionName,
      teacherName,
      color: colorForSubject(subjectName),
      coverage: parseCoverage(e.coverageJson),
    };
  });
}

export async function createExamForTeacher(userId: string, input: CreateExamInput) {
  const teacher = await Teacher.findOne({ where: { userId } });
  if (!teacher) return null;
  if (!input.classId) return false;

  const cls = await Class.findByPk(input.classId);
  if (!cls || cls.teacherId !== teacher.id) return false;

  const exam = await Exam.create({
    teacherId: teacher.id,
    classId: cls.id,
    title: (input.title?.trim() || "Exam").slice(0, 180),
    examDate: input.date,
    startTime: input.startTime?.trim() || null,
    duration: (input.duration?.trim() || "60 mins").slice(0, 40),
    status: input.status || "Scheduled",
    room: input.room?.trim() || null,
    coverageJson: input.coverage ?? [],
    gradingStatus: "Not Started",
    publishResults: false,
  });

  return exam;
}

export async function updateExamForTeacher(userId: string, examId: string, input: UpdateExamInput) {
  const teacher = await Teacher.findOne({ where: { userId } });
  if (!teacher) return null;

  const exam = await Exam.findByPk(examId);
  if (!exam || exam.teacherId !== teacher.id) return false;

  await exam.update({
    title: input.title?.trim() ? input.title.trim().slice(0, 180) : exam.title,
    examDate: input.date ?? exam.examDate,
    startTime: input.startTime !== undefined ? input.startTime?.trim() || null : exam.startTime,
    duration: input.duration?.trim() ? input.duration.trim().slice(0, 40) : exam.duration,
    status: input.status ?? exam.status,
    room: input.room !== undefined ? input.room?.trim() || null : exam.room,
    coverageJson: input.coverage ?? exam.coverageJson,
    gradingStatus: input.gradingStatus ?? exam.gradingStatus,
    publishResults: typeof input.publishResults === "boolean" ? input.publishResults : exam.publishResults,
  });

  return exam;
}
