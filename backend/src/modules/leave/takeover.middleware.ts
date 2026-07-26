import type { NextFunction, Request, Response } from "express";
import { Assignment, Class, Exam, Quiz, Section, Subject } from "../../db/models";
import { activeTakeoverClassIdsForTeacher } from "./leave.service";

function locked(res: Response) {
  return res.status(423).json({
    ok: false,
    code: "CLASS_TAKEOVER_ACTIVE",
    message:
      "This class is temporarily managed by the Super Admin during your approved leave.",
  });
}

async function activeIds(req: Request) {
  return new Set(
    await activeTakeoverClassIdsForTeacher(String(req.user?.sub ?? "")),
  );
}

export async function blockTakenOverClassParam(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if ((await activeIds(req)).has(Number(req.params.id))) return locked(res);
  return next();
}

export async function blockTakenOverBodyClass(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const classId = Number(req.body?.classId);
  if (classId && (await activeIds(req)).has(classId)) return locked(res);
  return next();
}

export async function blockTakenOverAttendance(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const lockedIds = await activeIds(req);
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  if (records.some((record: { classId?: unknown }) => lockedIds.has(Number(record.classId)))) {
    return locked(res);
  }
  return next();
}

export async function blockTakenOverAssignment(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const assignment = await Assignment.findByPk(req.params.id);
  if (
    assignment?.classId &&
    (await activeIds(req)).has(Number(assignment.classId))
  ) {
    return locked(res);
  }
  return next();
}

export async function blockTakenOverQuiz(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const quiz = await Quiz.findByPk(req.params.id);
  if (quiz?.classId && (await activeIds(req)).has(Number(quiz.classId))) {
    return locked(res);
  }
  return next();
}

export async function blockTakenOverExam(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const exam = await Exam.findByPk(req.params.id);
  if (exam?.classId && (await activeIds(req)).has(Number(exam.classId))) {
    return locked(res);
  }
  return next();
}

export async function blockTakenOverGradeSelection(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const lockedIds = await activeIds(req);
  if (!lockedIds.size) return next();
  const classes = await Class.findAll({
    where: { id: [...lockedIds] },
  });
  const [subjects, sections] = await Promise.all([
    Subject.findAll(),
    Section.findAll(),
  ]);
  const subjectMap = new Map(
    subjects.map((item) => [Number(item.id), item.name.toLowerCase()]),
  );
  const sectionMap = new Map(
    sections.map((item) => [Number(item.id), item.name.toLowerCase()]),
  );
  const selectedSubject = String(req.body?.subject ?? "").trim().toLowerCase();
  const selectedSection = String(req.body?.section ?? "").trim().toLowerCase();
  const selectedGrade = String(req.body?.gradeLevel ?? "").trim().toLowerCase();
  const matchesLockedClass = classes.some(
    (item) =>
      (!selectedSubject ||
        subjectMap.get(Number(item.subjectId)) === selectedSubject) &&
      (!selectedSection ||
        sectionMap.get(Number(item.sectionId)) === selectedSection ||
        String(item.name ?? "").toLowerCase() === selectedSection) &&
      (!selectedGrade ||
        String(item.gradeLevel ?? "").toLowerCase() === selectedGrade),
  );
  if (matchesLockedClass) return locked(res);
  return next();
}
