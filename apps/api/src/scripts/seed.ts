/* eslint-disable no-console -- this is a CLI script; console output is the entire point */
/**
 * Development seed script (Phase 0 §55).
 *
 * Creates a demo user + profile and runs a real ingestion pass so there's
 * actual data to click through locally — no fixture JSON, no fake API
 * responses. Safe to run multiple times (idempotent).
 *
 * Usage (after `docker compose up` or with local Mongo/Redis running):
 *   npm run seed -w @job-copilot/api
 *
 * This is dev/demo data only:
 *  - The demo user's email is obviously fake (demo@jobcopilot.dev)
 *  - Jobs are ingested from DemoJobProvider only (JobSource.type = "demo"),
 *    the same isolation Phase 0 requires between demo and real providers
 *  - Never run this against a production database
 */
import "dotenv/config";
import { connectMongo, User, Profile, SavedJob, Job } from "@job-copilot/db";
import { seedCanonicalSkills, ingestFromProvider } from "@job-copilot/domain";
import { DemoJobProvider } from "@job-copilot/jobs";
import { env } from "../config/env.js";
import { hashPassword } from "../modules/auth/password.js";

const DEMO_EMAIL = "demo@jobcopilot.dev";
const DEMO_PASSWORD = "DemoPassword123!";

async function main() {
  console.log("⚠️  Seeding development/demo data — never run this against production.\n");

  await connectMongo({ uri: env.MONGO_URI, serviceName: "seed-script" });

  console.log("→ Seeding canonical skill dictionary...");
  await seedCanonicalSkills();

  console.log("→ Running a real ingestion pass against the demo job provider...");
  const ingestionStats = await ingestFromProvider(new DemoJobProvider());
  console.log(
    `  fetched=${ingestionStats.fetchedCount} created=${ingestionStats.createdCount} ` +
      `updated=${ingestionStats.updatedCount} duplicates=${ingestionStats.duplicateCount} ` +
      `failed=${ingestionStats.failedCount}`,
  );

  console.log("→ Creating demo user...");
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      name: "Demo Candidate",
    });
    console.log(`  created user ${DEMO_EMAIL}`);
  } else {
    console.log(`  user ${DEMO_EMAIL} already exists, reusing`);
  }

  console.log("→ Creating demo profile (onboarding complete)...");
  // Deliberately a partial-but-realistic skill match against the seeded
  // demo jobs, not a perfect match on everything — so match scores in the
  // UI show a genuine spread (some 90%+, some 60-70%, some low) rather
  // than every job scoring identically, which would be a less honest demo.
  await Profile.findOneAndUpdate(
    { userId: user._id },
    {
      $set: {
        name: "Demo Candidate",
        currentRole: "Full Stack Developer",
        experienceYears: 2,
        location: "Bangalore, India",
        summary: "Full stack developer with experience across React, Node.js, and MongoDB.",
        targetRoles: ["Full Stack Developer", "React Developer", "Backend Developer"],
        preferredLocations: ["Bangalore", "Remote"],
        workMode: "remote",
        expectedSalary: { min: 1000000, max: 1600000, currency: "INR" },
        links: { github: "https://github.com/demo-candidate" },
        skills: [
          { name: "React", source: "user", confirmed: true },
          { name: "Node.js", source: "user", confirmed: true },
          { name: "TypeScript", source: "user", confirmed: true },
          { name: "MongoDB", source: "user", confirmed: true },
          { name: "Express", source: "user", confirmed: true },
          { name: "REST APIs", source: "user", confirmed: true },
        ],
        onboardingCompletedAt: new Date(),
      },
    },
    { upsert: true },
  );

  console.log("→ Saving/hiding a couple of jobs for the demo user...");
  const jobs = await Job.find({ status: "active" }).limit(5);
  if (jobs.length >= 2) {
    await SavedJob.findOneAndUpdate(
      { userId: user._id, jobId: jobs[0]!._id },
      { $set: { status: "saved" } },
      { upsert: true },
    );
    await SavedJob.findOneAndUpdate(
      { userId: user._id, jobId: jobs[1]!._id },
      { $set: { status: "hidden" } },
      { upsert: true },
    );
  }

  console.log("\n✅ Seed complete.\n");
  console.log("Log in with:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log("\n(This is demo data — do not reuse this password anywhere real.)");

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
