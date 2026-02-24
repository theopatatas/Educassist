import "dotenv/config";
import { createApp } from "./app";
import { initDb } from "./db";

async function main() {
  await initDb();

  const app = createApp();
  const port = Number(process.env.PORT || 4000);

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
