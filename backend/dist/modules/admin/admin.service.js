"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
const Parent_model_1 = require("../../db/models/Parent.model");
const Student_model_1 = require("../../db/models/Student.model");
const Teacher_model_1 = require("../../db/models/Teacher.model");
const User_model_1 = require("../../db/models/User.model");
async function getOverview() {
    const [users, students, teachers, parents] = await Promise.all([
        User_model_1.User.count(),
        Student_model_1.Student.count(),
        Teacher_model_1.Teacher.count(),
        Parent_model_1.Parent.count(),
    ]);
    return { users, students, teachers, parents };
}
