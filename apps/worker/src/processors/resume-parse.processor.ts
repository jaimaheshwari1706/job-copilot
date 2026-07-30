import { Worker } from "bullmq";
import {
  QUEUE_NAMES,
  resumeParseJobSchema,
  type ResumeParseResult,
} from "@job-copilot/shared";
import { getRedisConnection } from "@job-copilot/queue";
import { LocalStorageProvider } from "@job-copilot/storage";
import { Resume } from "@job-copilot/db";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const storage = new LocalStorageProvider(env.STORAGE_DIR);

async function extractText(buffer: Buffer, mimeType: string): Promise<{ text: string; parser: string }> {
  if (mimeType === "application/pdf") {
    // pdf-parse ships a CJS default export; dynamic import + .default handles
    // the interop cleanly under our ESM setup.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return { text: result.text, parser: "pdf-parse" };
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, parser: "mammoth" };
  }

  throw new Error(`Unsupported mime type for text extraction: ${mimeType}`);
}

export function createResumeParseWorker() {
  return new Worker(
    QUEUE_NAMES.RESUME_PARSE,
    async (job): Promise<ResumeParseResult> => {
      const payload = resumeParseJobSchema.parse(job.data);

      await Resume.updateOne(
        { _id: payload.resumeId },
        { $set: { textExtractionStatus: "processing" } },
      );

      try {
        const buffer = await storage.readFile(payload.storageKey);
        const { text, parser } = await extractText(buffer, payload.mimeType);

        await Resume.updateOne(
          { _id: payload.resumeId },
          {
            $set: {
              rawText: text,
              textExtractionStatus: "complete",
              parserUsed: parser,
              parseError: undefined,
            },
          },
        );

        logger.info(
          { resumeId: payload.resumeId, charCount: text.length },
          "Resume text extraction complete",
        );

        return { resumeId: payload.resumeId, status: "complete", charCount: text.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown extraction error";
        await Resume.updateOne(
          { _id: payload.resumeId },
          { $set: { textExtractionStatus: "failed", parseError: message } },
        );
        logger.error({ resumeId: payload.resumeId, err }, "Resume text extraction failed");
        return { resumeId: payload.resumeId, status: "failed", error: message };
      }
    },
    { connection: getRedisConnection(env.REDIS_URL), concurrency: 3 },
  );
}
