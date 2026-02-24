"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const db_1 = require("./db");
async function main() {
    await (0, db_1.initDb)();
    const app = (0, app_1.createApp)();
    const port = Number(process.env.PORT || 4000);
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
