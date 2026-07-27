import { redirect } from "next/navigation";

export default async function TakeoverWorkspaceIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/leave-management/${id}/workspace/classes`);
}
