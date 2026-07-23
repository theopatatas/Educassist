"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.uploadMyProfilePhoto = uploadMyProfilePhoto;
exports.deleteMyProfilePhoto = deleteMyProfilePhoto;
exports.create = create;
exports.list = list;
exports.getById = getById;
exports.activities = activities;
exports.update = update;
exports.remove = remove;
const users_service_1 = require("./users.service");
const users_upload_1 = require("./users.upload");
const auth_service_1 = require("../auth/auth.service");
function currentUserId(req) {
    return String(req.user?.sub ?? "");
}
async function requireSuperAdminPassword(req, res) {
    const password = String(req.body?.superAdminPassword ?? "");
    if (!password || !(await (0, auth_service_1.verifyUserPassword)(currentUserId(req), password))) {
        res.status(403).json({
            ok: false,
            message: "The Super Admin password is incorrect",
        });
        return false;
    }
    return true;
}
async function getMe(req, res) {
    const user = await (0, users_service_1.getUserById)(currentUserId(req));
    if (!user)
        return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, user });
}
async function updateMe(req, res) {
    const firstName = String(req.body?.firstName ?? "").trim();
    const middleName = String(req.body?.middleName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();
    const email = String(req.body?.email ?? "")
        .trim()
        .toLowerCase();
    const mobileNumber = String(req.body?.mobileNumber ?? "").trim();
    const displayName = String(req.body?.displayName ?? "").trim();
    const namePattern = /^[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*$/;
    if (!namePattern.test(firstName) ||
        !namePattern.test(lastName) ||
        (middleName && !namePattern.test(middleName)))
        return res.status(400).json({
            ok: false,
            message: "Names must start with capital letters and contain letters only",
        });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res
            .status(400)
            .json({ ok: false, message: "A valid email is required" });
    if (!/^09\d{9}$/.test(mobileNumber))
        return res.status(400).json({
            ok: false,
            message: "Mobile number must contain 11 digits beginning with 09",
        });
    if (!displayName || displayName.length > 150)
        return res.status(400).json({
            ok: false,
            message: "Display name is required and must not exceed 150 characters",
        });
    try {
        const user = await (0, users_service_1.updateUser)(currentUserId(req), {
            firstName,
            middleName: middleName || null,
            lastName,
            displayName,
            email,
            mobileNumber,
        });
        return res.json({ ok: true, user });
    }
    catch (error) {
        if (error.name === "SequelizeUniqueConstraintError")
            return res
                .status(409)
                .json({ ok: false, message: "Email is already in use" });
        throw error;
    }
}
async function uploadMyProfilePhoto(req, res) {
    if (!req.file)
        return res
            .status(400)
            .json({ ok: false, message: "Profile picture is required" });
    const result = await (0, users_service_1.setUserProfilePhoto)(currentUserId(req), (0, users_upload_1.profilePhotoUrl)(req.file.filename));
    if (!result)
        return res.status(404).json({ ok: false, message: "User not found" });
    (0, users_upload_1.removeProfilePhoto)(result.previous);
    return res.status(201).json({ ok: true, user: result.user });
}
async function deleteMyProfilePhoto(req, res) {
    const result = await (0, users_service_1.setUserProfilePhoto)(currentUserId(req), null);
    if (!result)
        return res.status(404).json({ ok: false, message: "User not found" });
    (0, users_upload_1.removeProfilePhoto)(result.previous);
    return res.json({ ok: true, user: result.user });
}
async function create(req, res) {
    if (!(await requireSuperAdminPassword(req, res)))
        return;
    const email = String(req.body?.email ?? "").trim();
    const password = String(req.body?.password ?? "");
    const firstName = String(req.body?.firstName ?? "").trim();
    const middleName = String(req.body?.middleName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();
    const mobileNumber = String(req.body?.mobileNumber ?? "").trim();
    const validName = /^[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*$/;
    if (!validName.test(firstName) || !validName.test(lastName)) {
        return res.status(400).json({
            ok: false,
            message: "First and last names must start with capital letters and contain letters only",
        });
    }
    if (middleName && !validName.test(middleName)) {
        return res.status(400).json({
            ok: false,
            message: "Middle name must start with a capital letter and contain letters only",
        });
    }
    if (!/^09\d{9}$/.test(mobileNumber)) {
        return res.status(400).json({
            ok: false,
            message: "Mobile number must contain 11 digits and start with 09",
        });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res
            .status(400)
            .json({ ok: false, message: "A valid email address is required" });
    }
    if (password.length < 8) {
        return res.status(400).json({
            ok: false,
            message: "Password must contain at least 8 characters",
        });
    }
    const result = await (0, users_service_1.createAdminUser)({
        email,
        password,
        firstName,
        middleName: middleName || null,
        lastName,
        mobileNumber,
        createdById: Number(currentUserId(req)),
    });
    if (!result.ok)
        return res.status(result.code).json(result);
    return res.status(201).json({ ok: true, user: result.user });
}
async function list(req, res) {
    const users = await (0, users_service_1.listUsers)();
    return res.json({ ok: true, users });
}
async function getById(req, res) {
    const user = await (0, users_service_1.getUserById)(req.params.id);
    if (!user)
        return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, user });
}
async function activities(req, res) {
    const records = await (0, users_service_1.getAdminActivities)(req.params.id);
    return res.json({ ok: true, activities: records });
}
async function update(req, res) {
    if (!(await requireSuperAdminPassword(req, res)))
        return;
    try {
        const firstName = req.body?.firstName;
        const middleName = req.body?.middleName;
        const lastName = req.body?.lastName;
        const mobileNumber = req.body?.mobileNumber;
        const validName = /^[A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*$/;
        if ((firstName !== undefined && !validName.test(String(firstName))) ||
            (lastName !== undefined && !validName.test(String(lastName))) ||
            (middleName && !validName.test(String(middleName)))) {
            return res.status(400).json({
                ok: false,
                message: "Names must start with capital letters and contain letters only",
            });
        }
        if (mobileNumber !== undefined && !/^09\d{9}$/.test(String(mobileNumber))) {
            return res.status(400).json({
                ok: false,
                message: "Mobile number must contain 11 digits beginning with 09",
            });
        }
        const updates = { ...(req.body ?? {}) };
        delete updates.superAdminPassword;
        const user = await (0, users_service_1.updateUser)(req.params.id, updates);
        if (!user)
            return res.status(404).json({ ok: false, message: "User not found" });
        const changed = Object.keys(updates).join(", ");
        await (0, users_service_1.recordAdminActivity)(req.params.id, currentUserId(req), "Account updated", changed ? `Updated: ${changed}` : undefined);
        return res.json({ ok: true, user });
    }
    catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res
                .status(409)
                .json({ ok: false, message: "Email is already in use" });
        }
        throw error;
    }
}
async function remove(req, res) {
    if (!(await requireSuperAdminPassword(req, res)))
        return;
    const currentUserId = req.user
        ?.sub;
    if (String(currentUserId) === String(req.params.id)) {
        return res.status(400).json({
            ok: false,
            message: "You cannot delete your own Super Admin account",
        });
    }
    const ok = await (0, users_service_1.deleteUser)(req.params.id);
    if (!ok)
        return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true });
}
