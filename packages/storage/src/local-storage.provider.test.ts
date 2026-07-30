import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalStorageProvider } from "./local-storage.provider.js";

let baseDir: string;
let provider: LocalStorageProvider;

beforeEach(async () => {
  baseDir = await mkdtemp(path.join(tmpdir(), "job-copilot-storage-test-"));
  provider = new LocalStorageProvider(baseDir);
});

afterEach(async () => {
  await rm(baseDir, { recursive: true, force: true });
});

describe("LocalStorageProvider", () => {
  it("saves a file and returns a storageKey, size, and sha256", async () => {
    const buffer = Buffer.from("hello resume content");
    const result = await provider.saveFile({
      buffer,
      userId: "user1",
      originalName: "resume.pdf",
    });

    expect(result.storageKey).toMatch(/^resumes\/user1\/.+\.pdf$/);
    expect(result.sizeBytes).toBe(buffer.length);
    expect(result.sha256).toHaveLength(64); // hex sha256
  });

  it("reads back exactly what was saved", async () => {
    const buffer = Buffer.from("some resume text content");
    const { storageKey } = await provider.saveFile({
      buffer,
      userId: "user1",
      originalName: "resume.docx",
    });

    const readBack = await provider.readFile(storageKey);
    expect(readBack.equals(buffer)).toBe(true);
  });

  it("throws when reading a nonexistent key", async () => {
    await expect(provider.readFile("resumes/user1/nonexistent.pdf")).rejects.toThrow();
  });

  it("deletes a file so it can no longer be read", async () => {
    const buffer = Buffer.from("temporary content");
    const { storageKey } = await provider.saveFile({
      buffer,
      userId: "user1",
      originalName: "resume.pdf",
    });

    await provider.deleteFile(storageKey);
    await expect(provider.readFile(storageKey)).rejects.toThrow();
  });

  it("deleting a nonexistent file does not throw", async () => {
    await expect(provider.deleteFile("resumes/user1/never-existed.pdf")).resolves.toBeUndefined();
  });

  it("guards against path traversal in storageKey", async () => {
    await expect(provider.readFile("../../../etc/passwd")).rejects.toThrow();
  });
});
