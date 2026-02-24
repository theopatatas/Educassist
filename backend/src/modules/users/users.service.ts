import { User } from "../../db/models/User.model";

export type UserUpdateInput = {
  email?: string;
  role?: "admin" | "teacher" | "student" | "parent";
};

export async function listUsers() {
  const users = await User.findAll({
    order: [["createdAt", "DESC"]],
  });
  return users.map((u) => ({ id: u.id, email: u.email, role: u.role.toLowerCase() }));
}

export async function getUserById(id: string) {
  const user = await User.findByPk(id);
  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role.toLowerCase() };
}

export async function updateUser(id: string, data: UserUpdateInput) {
  const user = await User.findByPk(id);
  if (!user) return null;

  const role = data.role ? data.role.toUpperCase() : user.role;

  await user.update({
    email: data.email ?? user.email,
    role,
  });

  return { id: user.id, email: user.email, role: user.role.toLowerCase() };
}

export async function deleteUser(id: string) {
  const user = await User.findByPk(id);
  if (!user) return false;
  await user.destroy();
  return true;
}
