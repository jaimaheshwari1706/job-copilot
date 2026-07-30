import { connectMongo } from "@job-copilot/db";
import { seedCanonicalSkills } from "@job-copilot/domain";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { createApp } from "./app.js";

async function main() {
  await connectMongo({ uri: env.MONGO_URI, serviceName: "api" });

  await seedCanonicalSkills();
  logger.info("Canonical skill dictionary seeded");

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`api listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
