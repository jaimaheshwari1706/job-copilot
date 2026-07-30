import { Job, JobListing, JobSource, IngestionRun } from "@job-copilot/db";
import {
  dedupeFingerprint,
  scoreDuplicateConfidence,
  DUPLICATE_CONFIDENCE_THRESHOLD,
  type JobProvider,
  type NormalizedJob,
} from "@job-copilot/jobs";
import { loadSkillNormalizer } from "../skills/load-skill-normalizer.js";

export interface IngestionStats {
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  duplicateCount: number;
  failedCount: number;
}

async function getOrCreateSource(provider: JobProvider) {
  let source = await JobSource.findOne({ name: provider.name });
  if (!source) {
    source = await JobSource.create({ name: provider.name, type: "demo", isActive: true });
  }
  return source;
}

/**
 * Finds an existing canonical Job this normalized listing likely belongs
 * to, using the coarse fingerprint to narrow candidates before running the
 * explainable confidence scorer — never a blind unique-hash merge
 * (Phase 0 amendment #5).
 */
async function findCanonicalMatch(normalized: NormalizedJob) {
  const fingerprint = dedupeFingerprint(normalized);
  const candidates = await Job.find({ dedupeFingerprint: fingerprint, status: "active" }).limit(5);

  for (const candidate of candidates) {
    const { confidence } = scoreDuplicateConfidence(normalized, {
      title: candidate.title,
      company: candidate.company,
      location: candidate.location ?? undefined,
      applyUrl: normalized.applyUrl,
      postedAt: candidate.postedAt ?? undefined,
    });
    if (confidence >= DUPLICATE_CONFIDENCE_THRESHOLD) return candidate;
  }
  return null;
}

/**
 * Runs a full ingestion pass for a single provider: fetch, normalize,
 * skill-normalize, hard/fuzzy dedup, upsert, record an IngestionRun.
 * Queue-independent by design — the BullMQ processor calls this, and so
 * can a one-off script (e.g. seeding) without needing Redis/a worker
 * running at all.
 */
export async function ingestFromProvider(
  provider: JobProvider,
  options: { keywords?: string } = {},
): Promise<IngestionStats> {
  const source = await getOrCreateSource(provider);
  const stats: IngestionStats = {
    fetchedCount: 0,
    createdCount: 0,
    updatedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
  };
  const errors: string[] = [];

  const run = await IngestionRun.create({ provider: provider.name, status: "running" });

  try {
    const rawJobs = await provider.searchJobs({ keywords: options.keywords });
    stats.fetchedCount = rawJobs.length;

    for (const raw of rawJobs) {
      try {
        const normalized = provider.normalizeJob(raw);
        const skillNormalizer = await loadSkillNormalizer();
        if (normalized.skills) {
          normalized.skills = skillNormalizer.normalizeAll(normalized.skills);
        }

        // Heuristic requirement->skill extraction: keep only the
        // requirement/preferred-qualification strings that are recognized
        // skill-dictionary entries, dropping free-text sentences that
        // aren't skills. NOT full NLP requirement extraction (Phase 8).
        const requiredSkills = skillNormalizer.normalizeAll(
          (normalized.requirements ?? []).filter((r) => skillNormalizer.isKnown(r)),
        );
        const preferredSkills = skillNormalizer.normalizeAll(
          (normalized.preferredQualifications ?? []).filter((r) => skillNormalizer.isKnown(r)),
        );

        const existingListing = await JobListing.findOne({
          sourceId: source._id,
          sourceJobId: normalized.sourceJobId,
        });

        if (existingListing) {
          await JobListing.updateOne(
            { _id: existingListing._id },
            { $set: { lastSeenAt: new Date(), rawPayload: raw } },
          );
          await Job.updateOne(
            { _id: existingListing.jobId },
            { $set: { postedAt: normalized.postedAt, expiresAt: normalized.expiresAt } },
          );
          stats.updatedCount++;
          continue;
        }

        const canonicalMatch = await findCanonicalMatch(normalized);

        let jobId;
        if (canonicalMatch) {
          jobId = canonicalMatch._id;
          stats.duplicateCount++;
        } else {
          const created = await Job.create({
            title: normalized.title,
            normalizedTitle: normalized.title.toLowerCase().trim(),
            company: normalized.company,
            companyLogo: normalized.companyLogo,
            location: normalized.location,
            country: normalized.country,
            workMode: normalized.workMode,
            employmentType: normalized.employmentType,
            experienceMin: normalized.experienceMin,
            experienceMax: normalized.experienceMax,
            salaryMin: normalized.salaryMin,
            salaryMax: normalized.salaryMax,
            salaryCurrency: normalized.salaryCurrency,
            description: normalized.description,
            responsibilities: normalized.responsibilities,
            requirements: normalized.requirements,
            preferredQualifications: normalized.preferredQualifications,
            skills: normalized.skills,
            requiredSkills,
            preferredSkills,
            dedupeFingerprint: dedupeFingerprint(normalized),
            postedAt: normalized.postedAt,
            expiresAt: normalized.expiresAt,
            status: "active",
          });
          jobId = created._id;
          stats.createdCount++;
        }

        await JobListing.create({
          jobId,
          sourceId: source._id,
          sourceJobId: normalized.sourceJobId,
          applyUrl: normalized.applyUrl,
          sourceUrl: normalized.sourceUrl,
          postedAt: normalized.postedAt,
          expiresAt: normalized.expiresAt,
          lastSeenAt: new Date(),
          rawPayload: raw,
          providerSchemaVersion: provider.schemaVersion,
        });
      } catch (err) {
        stats.failedCount++;
        errors.push(err instanceof Error ? err.message : "Unknown error");
      }
    }

    await JobSource.updateOne({ _id: source._id }, { $set: { lastFetchedAt: new Date() } });
    await IngestionRun.updateOne(
      { _id: run._id },
      {
        $set: {
          ...stats,
          status: "complete",
          completedAt: new Date(),
          errorSummary: errors.length > 0 ? errors.slice(0, 5).join("; ") : undefined,
        },
      },
    );

    return stats;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await IngestionRun.updateOne(
      { _id: run._id },
      { $set: { status: "failed", completedAt: new Date(), errorSummary: message, ...stats } },
    );
    throw err;
  }
}
