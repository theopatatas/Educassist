import "dotenv/config";
import { createApp } from "./app";
import { initDb } from "./db";
import { reconcileLeavePeriods } from "./modules/leave/leave.service";
import { getAcademicContext } from "./modules/admin/settings.service";

async function main() {
  await initDb();

  const app = createApp();
  const port = Number(process.env.PORT || 4000);

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
  const leaveReconciliation = setInterval(
    () =>
      void Promise.all([reconcileLeavePeriods(), getAcademicContext()]).catch(
        (error: unknown) =>
          console.error("Scheduled reconciliation failed", error),
      ),
    5 * 60 * 1000,
  );
  leaveReconciliation.unref();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
