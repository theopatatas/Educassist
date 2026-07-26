"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const db_1 = require("./db");
const leave_service_1 = require("./modules/leave/leave.service");
const settings_service_1 = require("./modules/admin/settings.service");
async function main() {
    await (0, db_1.initDb)();
    const app = (0, app_1.createApp)();
    const port = Number(process.env.PORT || 4000);
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
    const leaveReconciliation = setInterval(() => void Promise.all([(0, leave_service_1.reconcileLeavePeriods)(), (0, settings_service_1.getAcademicContext)()]).catch((error) => console.error("Scheduled reconciliation failed", error)), 5 * 60 * 1000);
    leaveReconciliation.unref();
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
