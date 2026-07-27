"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
exports.getRecentActivities = getRecentActivities;
exports.getPendingTasks = getPendingTasks;
const sequelize_1 = require("sequelize");
const AdminAccountActivity_model_1 = require("../../db/models/AdminAccountActivity.model");
const Class_model_1 = require("../../db/models/Class.model");
const ClassTakeover_model_1 = require("../../db/models/ClassTakeover.model");
const GradeItem_model_1 = require("../../db/models/GradeItem.model");
const Parent_model_1 = require("../../db/models/Parent.model");
const ParentStudent_model_1 = require("../../db/models/ParentStudent.model");
const SchoolEvent_model_1 = require("../../db/models/SchoolEvent.model");
const Student_model_1 = require("../../db/models/Student.model");
const SystemAuditLog_model_1 = require("../../db/models/SystemAuditLog.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const TeacherLeaveRequest_model_1 = require("../../db/models/TeacherLeaveRequest.model");
const User_model_1 = require("../../db/models/User.model");
const settings_service_1 = require("./settings.service");
function userName(user) {
    if (!user)
        return "System";
    return (user.displayName ||
        [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(" ") ||
        user.email);
}
function roleLabel(role) {
    if (!role)
        return "System";
    return String(role)
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
function auditPresentation(row) {
    const metadata = row.metadata && typeof row.metadata === "object"
        ? row.metadata
        : {};
    const current = metadata.current && typeof metadata.current === "object"
        ? metadata.current
        : {};
    const previous = metadata.previous && typeof metadata.previous === "object"
        ? metadata.previous
        : {};
    const academicYear = String(current.currentSchoolYear ?? previous.currentSchoolYear ?? "");
    const quarter = String(current.currentQuarter ?? previous.currentQuarter ?? "");
    const presentations = {
        LEAVE_CREATED: {
            title: "Teacher leave request submitted",
            description: "A teacher submitted a leave request for review.",
            module: "Leave Management",
            category: "leave",
            href: "/admin/leave-management",
        },
        LEAVE_EDITED: {
            title: "Teacher leave request updated",
            description: "A pending teacher leave request was updated.",
            module: "Leave Management",
            category: "leave",
            href: "/admin/leave-management",
        },
        LEAVE_CANCELLED: {
            title: "Teacher leave request cancelled",
            description: "A pending teacher leave request was cancelled.",
            module: "Leave Management",
            category: "leave",
            href: "/admin/leave-management",
        },
        LEAVE_APPROVED: {
            title: "Teacher leave request approved",
            description: "A teacher leave request was approved for takeover review.",
            module: "Leave Management",
            category: "approved",
            href: "/admin/leave-management",
        },
        LEAVE_REJECTED: {
            title: "Teacher leave request rejected",
            description: "A teacher leave request was reviewed and rejected.",
            module: "Leave Management",
            category: "rejected",
            href: "/admin/leave-management",
        },
        EMERGENCY_LEAVE_CREATED: {
            title: "Emergency leave created",
            description: "The Super Admin created an emergency teacher leave.",
            module: "Leave Management",
            category: "leave",
            href: "/admin/leave-management",
        },
        TAKEOVER_ACTIVATED: {
            title: "Class takeover activated",
            description: "Temporary class management access was activated.",
            module: "Class Takeover",
            category: "takeover",
            href: "/admin/leave-management",
        },
        TAKEOVER_COMPLETED: {
            title: "Class takeover completed",
            description: "Temporary class management access was completed.",
            module: "Class Takeover",
            category: "completed",
            href: "/admin/leave-management",
        },
        TAKEOVER_CANCELLED: {
            title: "Class takeover cancelled",
            description: "Temporary class management access was cancelled.",
            module: "Class Takeover",
            category: "cancelled",
            href: "/admin/leave-management",
        },
        TAKEOVER_AUTO_COMPLETED: {
            title: "Class takeover automatically completed",
            description: "The approved leave period ended and access was restored.",
            module: "Class Takeover",
            category: "completed",
            href: "/admin/leave-management",
        },
        ACADEMIC_YEAR_CHANGED: {
            title: "Academic year changed",
            description: academicYear
                ? `${academicYear} is now the current academic year.`
                : "The current academic year was updated.",
            module: "Academic Settings",
            category: "academic",
            href: "/admin/settings",
        },
        ACADEMIC_QUARTER_CHANGED: {
            title: `${quarter || "Active quarter"} activated`,
            description: academicYear
                ? `${quarter || "The active quarter"} was activated for Academic Year ${academicYear}.`
                : "The active academic quarter was updated.",
            module: "Academic Settings",
            category: "academic",
            href: "/admin/settings",
        },
        ACADEMIC_SETTINGS_UPDATED: {
            title: "Academic settings updated",
            description: "Important academic configuration was updated.",
            module: "Academic Settings",
            category: "settings",
            href: "/admin/settings",
        },
        GRADE_ENCODING_REOPENED: {
            title: "Grade encoding reopened",
            description: metadata.deadline
                ? `Grade encoding is open until ${String(metadata.deadline)}.`
                : "The grade encoding window was reopened.",
            module: "Grade Encoding",
            category: "grades",
            href: "/admin/settings",
        },
        GRADE_ENCODING_LOCKED: {
            title: "Grade encoding closed",
            description: "Grade encoding and publishing were locked.",
            module: "Grade Encoding",
            category: "grades",
            href: "/admin/settings",
        },
        PUBLISHED_GRADES_UNLOCKED: {
            title: "Published grades unlocked",
            description: "A published grade record was unlocked for correction.",
            module: "Grade Publishing",
            category: "grades",
            href: "/admin/settings",
        },
    };
    return (presentations[row.action] ?? {
        title: row.action
            .toLowerCase()
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        description: `An action was recorded in ${row.entityType.replaceAll("_", " ")}.`,
        module: row.entityType.replaceAll("_", " "),
        category: "system",
        href: "/admin/dashboard",
    });
}
async function getOverview() {
    const [users, students, teachers, parents] = await Promise.all([
        User_model_1.User.count(),
        Student_model_1.Student.count(),
        Teacher_model_1.Teacher.count(),
        Parent_model_1.Parent.count(),
    ]);
    const enrolledStudents = students;
    return { users, students, teachers, parents, enrolledStudents };
}
async function getRecentActivities() {
    const [auditRows, accountRows, users, students, parentLinks, classes, gradeItems, events,] = await Promise.all([
        SystemAuditLog_model_1.SystemAuditLog.findAll({
            order: [["createdAt", "DESC"]],
            limit: 30,
        }),
        AdminAccountActivity_model_1.AdminAccountActivity.findAll({
            order: [["createdAt", "DESC"]],
            limit: 20,
        }),
        User_model_1.User.findAll({ order: [["createdAt", "DESC"]], limit: 20 }),
        Student_model_1.Student.findAll({ order: [["createdAt", "DESC"]], limit: 15 }),
        ParentStudent_model_1.ParentStudent.findAll({ order: [["createdAt", "DESC"]], limit: 15 }),
        Class_model_1.Class.findAll({ order: [["createdAt", "DESC"]], limit: 15 }),
        GradeItem_model_1.GradeItem.findAll({
            where: { name: { [sequelize_1.Op.like]: "%|published" } },
            order: [["updatedAt", "DESC"]],
            limit: 20,
        }),
        SchoolEvent_model_1.SchoolEvent.findAll({ order: [["createdAt", "DESC"]], limit: 15 }),
    ]);
    const actorIds = new Set();
    auditRows.forEach((row) => actorIds.add(Number(row.userId)));
    accountRows.forEach((row) => actorIds.add(Number(row.actorUserId)));
    users.forEach((row) => {
        if (row.createdById)
            actorIds.add(Number(row.createdById));
    });
    events.forEach((row) => actorIds.add(Number(row.createdBy)));
    const teachers = await Teacher_model_1.Teacher.findAll({
        where: {
            id: {
                [sequelize_1.Op.in]: [
                    ...new Set([
                        ...auditRows
                            .map((row) => Number(row.affectedTeacherId))
                            .filter(Boolean),
                        ...classes.map((row) => Number(row.teacherId)).filter(Boolean),
                    ]),
                ],
            },
        },
    });
    teachers.forEach((teacher) => actorIds.add(Number(teacher.userId)));
    const actorRows = actorIds.size
        ? await User_model_1.User.findAll({ where: { id: [...actorIds] } })
        : [];
    const actorMap = new Map(actorRows.map((actor) => [Number(actor.id), actor]));
    const teacherMap = new Map(teachers.map((teacher) => [Number(teacher.id), teacher]));
    const studentIds = [
        ...new Set(parentLinks.map((link) => Number(link.studentId))),
    ];
    const linkedStudents = studentIds.length
        ? await Student_model_1.Student.findAll({ where: { id: studentIds } })
        : [];
    const linkedStudentMap = new Map(linkedStudents.map((student) => [Number(student.id), student]));
    const parentIds = [
        ...new Set(parentLinks.map((link) => Number(link.parentId))),
    ];
    const linkedParents = parentIds.length
        ? await Parent_model_1.Parent.findAll({ where: { id: parentIds } })
        : [];
    const linkedParentMap = new Map(linkedParents.map((parent) => [Number(parent.id), parent]));
    const classMap = new Map(classes.map((row) => [Number(row.id), row]));
    const activities = [];
    for (const row of auditRows) {
        const presentation = auditPresentation(row);
        const actor = actorMap.get(Number(row.userId));
        activities.push({
            id: `audit-${row.id}`,
            ...presentation,
            user: userName(actor),
            role: roleLabel(row.role),
            occurredAt: row.createdAt,
        });
    }
    for (const row of accountRows) {
        const actor = actorMap.get(Number(row.actorUserId));
        activities.push({
            id: `account-${row.id}`,
            title: row.action,
            description: row.details || "An administrator account was updated.",
            user: userName(actor),
            role: roleLabel(actor?.role),
            module: "Admin Accounts",
            occurredAt: row.createdAt,
            category: "account",
            href: "/admin/accounts",
        });
    }
    for (const row of users.filter((user) => String(user.role).toUpperCase() !== "ADMIN")) {
        const actor = row.createdById
            ? actorMap.get(Number(row.createdById))
            : null;
        activities.push({
            id: `user-${row.id}`,
            title: "User account created",
            description: `${roleLabel(row.role)} account ${row.email} was created.`,
            user: userName(actor),
            role: roleLabel(actor?.role),
            module: "User Management",
            occurredAt: row.getDataValue("createdAt"),
            category: "account",
            href: String(row.role).toUpperCase() === "TEACHER"
                ? "/admin/teachers"
                : String(row.role).toUpperCase() === "STUDENT"
                    ? "/admin/students"
                    : "/admin/accounts",
        });
    }
    for (const row of students) {
        activities.push({
            id: `student-${row.id}`,
            title: "Student enrolled",
            description: `${[row.firstName, row.middleName, row.lastName].filter(Boolean).join(" ")} was added to Student Management.`,
            user: "System",
            role: "System",
            module: "Student Management",
            occurredAt: row.getDataValue("createdAt"),
            category: "student",
            href: "/admin/students",
        });
    }
    for (const row of parentLinks) {
        const parent = linkedParentMap.get(Number(row.parentId));
        const student = linkedStudentMap.get(Number(row.studentId));
        activities.push({
            id: `parent-link-${row.id}`,
            title: "Parent–Student link created",
            description: `${parent ? `${parent.firstName} ${parent.lastName}`.trim() : "A parent"} was linked to ${student ? `${student.firstName} ${student.lastName}`.trim() : "a student"}.`,
            user: "System",
            role: "System",
            module: "Parent Management",
            occurredAt: row.getDataValue("createdAt"),
            category: "parent",
            href: "/admin/students",
        });
    }
    for (const row of classes) {
        const teacher = teacherMap.get(Number(row.teacherId));
        const actor = teacher
            ? actorMap.get(Number(teacher.userId))
            : null;
        activities.push({
            id: `class-${row.id}`,
            title: "Teacher assigned to a class",
            description: `${teacher ? `${teacher.firstName} ${teacher.lastName}`.trim() : "A teacher"} is assigned to ${row.name || row.gradeLevel || `Class #${row.id}`}.`,
            user: userName(actor),
            role: roleLabel(actor?.role || "teacher"),
            module: "Class Management",
            occurredAt: row.getDataValue("createdAt"),
            category: "class",
            href: "/admin/teachers",
        });
    }
    for (const row of gradeItems) {
        const relatedClass = classMap.get(Number(row.classId));
        const teacher = relatedClass
            ? teacherMap.get(Number(relatedClass.teacherId))
            : null;
        const actor = teacher
            ? actorMap.get(Number(teacher.userId))
            : null;
        activities.push({
            id: `grade-${row.id}`,
            title: "Grades published",
            description: `${String(row.name).split("|").slice(0, 2).join(" • ")} was published${row.academicYear ? ` for ${row.academicYear}` : ""}.`,
            user: userName(actor),
            role: roleLabel(actor?.role || "teacher"),
            module: "Grade Publishing",
            occurredAt: row.getDataValue("updatedAt"),
            category: "grades",
            href: "/admin/settings",
        });
    }
    for (const row of events) {
        const actor = actorMap.get(Number(row.createdBy));
        activities.push({
            id: `event-${row.id}`,
            title: row.category === "Announcement"
                ? "Announcement published"
                : `${row.category} published`,
            description: `${row.title} was shared with ${row.targetAudience}.`,
            user: userName(actor),
            role: roleLabel(actor?.role),
            module: "Calendar",
            occurredAt: row.createdAt,
            category: "event",
            href: "/admin/dashboard",
        });
    }
    return activities
        .filter((activity) => Boolean(activity.occurredAt))
        .sort((left, right) => new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime())
        .slice(0, 20);
}
async function getPendingTasks() {
    const [pendingLeaves, approvedLeaves, activeTakeovers, teachers, classes, students, linkedStudentCount, academic, gradeProgress,] = await Promise.all([
        TeacherLeaveRequest_model_1.TeacherLeaveRequest.count({ where: { status: "PENDING" } }),
        TeacherLeaveRequest_model_1.TeacherLeaveRequest.findAll({
            where: { status: "APPROVED" },
            attributes: ["id"],
        }),
        ClassTakeover_model_1.ClassTakeover.count({ where: { status: "ACTIVE" } }),
        Teacher_model_1.Teacher.findAll({
            where: { archivedAt: null },
            attributes: ["id"],
        }),
        Class_model_1.Class.findAll({
            attributes: ["id", "teacherId", "subjectId", "sectionId"],
        }),
        Student_model_1.Student.count({ where: { archivedAt: null } }),
        ParentStudent_model_1.ParentStudent.count({
            distinct: true,
            col: "studentId",
        }),
        (0, settings_service_1.getAcademicContext)(),
        (0, settings_service_1.getGradeSubmissionProgress)(),
    ]);
    const approvedIds = approvedLeaves.map((leave) => Number(leave.id));
    const awaitingTakeover = approvedIds.length
        ? await ClassTakeover_model_1.ClassTakeover.count({
            where: {
                leaveRequestId: approvedIds,
                status: "NOT_STARTED",
            },
        })
        : 0;
    const assignedTeacherIds = new Set(classes.map((row) => Number(row.teacherId)).filter(Boolean));
    const teachersWithoutClasses = teachers.filter((teacher) => !assignedTeacherIds.has(Number(teacher.id))).length;
    const incompleteClasses = classes.filter((row) => !row.subjectId || !row.sectionId).length;
    const studentsWithoutParents = Math.max(0, students - linkedStudentCount);
    const missingGradeSubmissions = Number(gradeProgress?.totals?.missingClasses ?? 0);
    const tasks = [
        {
            id: "pending-leaves",
            label: "Teacher leave requests awaiting review",
            description: "Approve or reject submitted teacher leave requests.",
            count: pendingLeaves,
            status: "warning",
            href: "/admin/leave-management",
        },
        {
            id: "approved-leaves",
            label: "Approved leaves awaiting takeover",
            description: "Review approved leave periods and manually start takeover.",
            count: awaitingTakeover,
            status: "critical",
            href: "/admin/leave-management",
        },
        {
            id: "active-takeovers",
            label: "Active class takeovers",
            description: "Monitor temporary Super Admin class access.",
            count: activeTakeovers,
            status: "info",
            href: "/admin/leave-management",
        },
        {
            id: "missing-grades",
            label: "Classes missing grade submissions",
            description: "Follow up on missing grades for the active encoding period.",
            count: missingGradeSubmissions,
            status: "critical",
            href: "/admin/settings",
        },
        {
            id: "teachers-without-classes",
            label: "Teachers without assigned classes",
            description: "Assign subjects, sections, or classes to these teachers.",
            count: teachersWithoutClasses,
            status: "warning",
            href: "/admin/teachers",
        },
        {
            id: "incomplete-classes",
            label: "Classes missing subject or section",
            description: "Complete the class subject and section assignments.",
            count: incompleteClasses,
            status: "warning",
            href: "/admin/teachers",
        },
        {
            id: "students-without-parents",
            label: "Students without linked parents",
            description: "Review guardian details and Parent account links.",
            count: studentsWithoutParents,
            status: "info",
            href: "/admin/students",
        },
    ];
    if (!academic.currentSchoolYear ||
        !academic.currentQuarter ||
        academic.gradeEncodingStatus === "UNAVAILABLE") {
        tasks.unshift({
            id: "academic-configuration",
            label: "Academic period requires configuration",
            description: "Set the current academic year and active quarter in Settings.",
            count: 1,
            status: "critical",
            href: "/admin/settings",
        });
    }
    return tasks.filter((task) => task.count > 0);
}
