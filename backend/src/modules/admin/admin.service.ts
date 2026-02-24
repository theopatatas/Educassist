import { Parent } from "../../db/models/Parent.model";
import { Student } from "../../db/models/Student.model";
import { Teacher } from "../../db/models/Teacher.model";
import { User } from "../../db/models/User.model";

export async function getOverview() {
  const [users, students, teachers, parents] = await Promise.all([
    User.count(),
    Student.count(),
    Teacher.count(),
    Parent.count(),
  ]);

  const enrolledStudents = students;

  return { users, students, teachers, parents, enrolledStudents };
}
