import bcrypt from "bcryptjs";
import { User } from "../../db/models/User.model";
import { AdminAccountActivity } from "../../db/models/AdminAccountActivity.model";

export type UserUpdateInput = {
  email?: string;
  role?: "admin" | "teacher" | "student" | "parent";
  isActive?: boolean;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  mobileNumber?: string;
  displayName?: string | null;
};

function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    mobileNumber: user.mobileNumber,
    displayName: user.displayName,
    profilePhotoUrl: user.profilePhotoUrl,
    passwordChangedAt: user.passwordChangedAt,
    role: user.role.toLowerCase(),
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.getDataValue("createdAt") as Date | undefined,
    updatedAt: user.getDataValue("updatedAt") as Date | undefined,
    createdById: user.createdById,
  };
}

async function creatorSummary(createdById: number | null) {
  if (!createdById) return null;
  const creator = await User.findByPk(createdById);
  if (!creator) return null;
  return {
    id: creator.id,
    name:
      [creator.firstName, creator.middleName, creator.lastName]
        .filter(Boolean)
        .join(" ") || creator.email,
    email: creator.email,
  };
}

export async function recordAdminActivity(
  adminUserId: string | number,
  actorUserId: string | number,
  action: string,
  details?: string,
) {
  await AdminAccountActivity.create({
    adminUserId: Number(adminUserId),
    actorUserId: Number(actorUserId),
    action,
    details: details || null,
  });
}

export async function getAdminActivities(id: string) {
  const rows = await AdminAccountActivity.findAll({
    where: { adminUserId: id },
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
  const actorIds = [...new Set(rows.map((row) => row.actorUserId))];
  const actors = actorIds.length
    ? await User.findAll({ where: { id: actorIds } })
    : [];
  const actorMap = new Map(actors.map((actor) => [String(actor.id), actor]));
  return rows.map((row) => {
    const actor = actorMap.get(String(row.actorUserId));
    return {
      id: row.id,
      action: row.action,
      details: row.details,
      createdAt: row.createdAt,
      actor: actor
        ? {
            id: actor.id,
            name:
              [actor.firstName, actor.middleName, actor.lastName]
                .filter(Boolean)
                .join(" ") || actor.email,
          }
        : null,
    };
  });
}

export async function listUsers() {
  const users = await User.findAll({
    order: [["createdAt", "DESC"]],
  });
  return users.map(serializeUser);
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  mobileNumber: string;
  createdById: number;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return {
      ok: false as const,
      code: 409,
      message: "Email is already in use",
    };
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    email,
    firstName: input.firstName.trim(),
    middleName: input.middleName?.trim() || null,
    lastName: input.lastName.trim(),
    mobileNumber: input.mobileNumber,
    passwordHash,
    role: "ADMIN",
    isActive: true,
    refreshTokenHash: null,
    createdById: input.createdById,
  });
  await recordAdminActivity(user.id, input.createdById, "Account created");
  return { ok: true as const, user: serializeUser(user) };
}

export async function getUserById(id: string) {
  const user = await User.findByPk(id);
  if (!user) return null;
  return {
    ...serializeUser(user),
    createdBy: await creatorSummary(user.createdById),
  };
}

export async function updateUser(id: string, data: UserUpdateInput) {
  const user = await User.findByPk(id);
  if (!user) return null;

  const role = data.role ? data.role.toUpperCase() : user.role;

  await user.update({
    email: data.email ?? user.email,
    role,
    isActive: data.isActive ?? user.isActive,
    firstName: data.firstName ?? user.firstName,
    middleName:
      data.middleName === undefined ? user.middleName : data.middleName,
    lastName: data.lastName ?? user.lastName,
    mobileNumber: data.mobileNumber ?? user.mobileNumber,
    displayName:
      data.displayName === undefined ? user.displayName : data.displayName,
  });

  return serializeUser(user);
}

export async function deleteUser(id: string) {
  const user = await User.findByPk(id);
  if (!user) return false;
  await user.destroy();
  return true;
}

export async function setUserProfilePhoto(
  id: string,
  profilePhotoUrl: string | null,
) {
  const user = await User.findByPk(id);
  if (!user) return null;
  const previous = user.profilePhotoUrl;
  await user.update({ profilePhotoUrl });
  return { previous, user: serializeUser(user) };
}
