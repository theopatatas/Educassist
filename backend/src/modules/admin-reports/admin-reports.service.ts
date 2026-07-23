import { Op } from "sequelize";
import { Attendance } from "../../db/models/Attendance.model";
import { Class } from "../../db/models/Class.model";
import { Enrollment } from "../../db/models/Enrollment.model";
import { Section } from "../../db/models/Section.model";
import { Student } from "../../db/models/Student.model";
import { Subject } from "../../db/models/Subject.model";
import { listEvents } from "../events/events.service";

export type ReportType = "students" | "attendance" | "enrollment" | "events";
export type ReportFilters = {
  grade?: string;
  section?: string;
  dateFrom?: string;
  dateTo?: string;
};
export type ReportDataset = {
  name: string;
  columns: string[];
  rows: Array<Array<string | number>>;
};

function studentName(student: Student) {
  return `${student.lastName}, ${student.firstName}${student.middleName ? ` ${student.middleName}` : ""}`;
}

async function relatedData(classIds: number[], students: Student[]) {
  const sectionIds = [
    ...new Set(students.map((student) => student.sectionId).filter(Boolean)),
  ] as number[];
  const classes = classIds.length
    ? await Class.findAll({ where: { id: classIds } })
    : [];
  const subjectIds = [
    ...new Set(classes.map((item) => item.subjectId).filter(Boolean)),
  ] as number[];
  const classSectionIds = classes
    .map((item) => item.sectionId)
    .filter(Boolean) as number[];
  const [sections, subjects] = await Promise.all([
    Section.findAll({
      where: { id: [...new Set([...sectionIds, ...classSectionIds])] },
    }),
    subjectIds.length ? Subject.findAll({ where: { id: subjectIds } }) : [],
  ]);
  return {
    classMap: new Map(classes.map((item) => [Number(item.id), item])),
    sectionMap: new Map(sections.map((item) => [Number(item.id), item.name])),
    subjectMap: new Map(subjects.map((item) => [Number(item.id), item.name])),
  };
}

function matchesStudent(
  student: Student,
  filters: ReportFilters,
  sectionMap: Map<number, string>,
) {
  return (
    !student.archivedAt &&
    (!filters.grade || student.yearLevel === filters.grade) &&
    (!filters.section ||
      sectionMap.get(Number(student.sectionId)) === filters.section)
  );
}

export async function buildAdminReport(
  type: ReportType,
  filters: ReportFilters,
): Promise<ReportDataset> {
  if (type === "events") {
    const events = await listEvents({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    return {
      name: "Meetings and Events Report",
      columns: ["Title", "Category", "Date", "Time", "Location", "Status"],
      rows: events.map((event) => [
        event.title,
        event.category,
        event.eventDate,
        event.startTime?.slice(0, 5) || "—",
        event.location || "—",
        event.status,
      ]),
    };
  }

  const students = await Student.findAll({ order: [["lastName", "ASC"]] });
  const studentSections = await Section.findAll();
  const sectionMap = new Map(
    studentSections.map((section) => [Number(section.id), section.name]),
  );
  const eligibleStudents = students.filter((student) =>
    matchesStudent(student, filters, sectionMap),
  );
  const eligibleIds = eligibleStudents.map((student) => Number(student.id));
  const studentMap = new Map(
    eligibleStudents.map((student) => [Number(student.id), student]),
  );

  if (type === "students") {
    return {
      name: "Student Report",
      columns: [
        "LRN",
        "Student Name",
        "Grade Level",
        "Section",
        "Date Created",
      ],
      rows: eligibleStudents
        .filter((student) => {
          const created = String(student.getDataValue("createdAt") ?? "").slice(
            0,
            10,
          );
          return (
            (!filters.dateFrom || created >= filters.dateFrom) &&
            (!filters.dateTo || created <= filters.dateTo)
          );
        })
        .map((student) => [
          student.lrn,
          studentName(student),
          student.yearLevel || "—",
          sectionMap.get(Number(student.sectionId)) || "—",
          String(student.getDataValue("createdAt") ?? "").slice(0, 10) || "—",
        ]),
    };
  }

  if (type === "attendance") {
    const records = eligibleIds.length
      ? await Attendance.findAll({
          where: {
            studentId: { [Op.in]: eligibleIds },
            ...(filters.dateFrom || filters.dateTo
              ? {
                  date: {
                    ...(filters.dateFrom ? { [Op.gte]: filters.dateFrom } : {}),
                    ...(filters.dateTo ? { [Op.lte]: filters.dateTo } : {}),
                  },
                }
              : {}),
          },
          order: [["date", "DESC"]],
        })
      : [];
    const related = await relatedData(
      [...new Set(records.map((record) => Number(record.classId)))],
      eligibleStudents,
    );
    return {
      name: "Attendance Report",
      columns: [
        "Date",
        "LRN",
        "Student Name",
        "Grade Level",
        "Section",
        "Subject",
        "Status",
      ],
      rows: records.map((record) => {
        const student = studentMap.get(Number(record.studentId))!;
        const cls = related.classMap.get(Number(record.classId));
        return [
          record.date,
          student.lrn,
          studentName(student),
          student.yearLevel || cls?.gradeLevel || "—",
          related.sectionMap.get(Number(student.sectionId || cls?.sectionId)) ||
            "—",
          related.subjectMap.get(Number(cls?.subjectId)) || cls?.name || "—",
          record.status,
        ];
      }),
    };
  }

  const enrollments = eligibleIds.length
    ? await Enrollment.findAll({
        where: {
          studentId: { [Op.in]: eligibleIds },
          ...(filters.dateFrom || filters.dateTo
            ? {
                enrolledAt: {
                  ...(filters.dateFrom
                    ? { [Op.gte]: new Date(filters.dateFrom) }
                    : {}),
                  ...(filters.dateTo
                    ? { [Op.lte]: new Date(`${filters.dateTo}T23:59:59`) }
                    : {}),
                },
              }
            : {}),
        },
        order: [["enrolledAt", "DESC"]],
      })
    : [];
  const related = await relatedData(
    [...new Set(enrollments.map((record) => Number(record.classId)))],
    eligibleStudents,
  );
  return {
    name: "Enrollment Report",
    columns: [
      "Enrollment Date",
      "LRN",
      "Student Name",
      "Grade Level",
      "Section",
      "Class",
      "Subject",
    ],
    rows: enrollments.map((record) => {
      const student = studentMap.get(Number(record.studentId))!;
      const cls = related.classMap.get(Number(record.classId));
      return [
        record.enrolledAt
          ? new Date(record.enrolledAt).toISOString().slice(0, 10)
          : "—",
        student.lrn,
        studentName(student),
        student.yearLevel || cls?.gradeLevel || "—",
        related.sectionMap.get(Number(student.sectionId || cls?.sectionId)) ||
          "—",
        cls?.name || "—",
        related.subjectMap.get(Number(cls?.subjectId)) || "—",
      ];
    }),
  };
}
