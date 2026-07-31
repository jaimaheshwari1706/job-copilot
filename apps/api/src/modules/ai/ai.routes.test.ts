import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { signAccessToken } from "../auth/jwt.js";

function authHeader() {
  const token = signAccessToken({ sub: "507f1f77bcf86cd799439011", email: "test@example.com" });
  return `Bearer ${token}`;
}

describe("ai routes require authentication", () => {
  it("GET /ai/status rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/ai/status");
    expect(res.status).toBe(401);
  });

  it("POST /ai/analyze-job-description rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/ai/analyze-job-description")
      .send({ jobDescriptionText: "x".repeat(60) });
    expect(res.status).toBe(401);
  });

  it("POST /ai/cover-letter rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/ai/cover-letter").send({ jobId: "507f1f77bcf86cd799439011" });
    expect(res.status).toBe(401);
  });
});

describe("GET /ai/status", () => {
  it("reports AI as not configured when ANTHROPIC_API_KEY is unset (the state of this test environment)", async () => {
    const app = createApp();
    const res = await request(app).get("/ai/status").set("Authorization", authHeader());
    expect(res.status).toBe(200);
    expect(res.body.data.configured).toBe(false);
  });
});

describe("POST /ai/analyze-job-description validation", () => {
  it("rejects job description text shorter than the minimum length", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/ai/analyze-job-description")
      .set("Authorization", authHeader())
      .send({ jobDescriptionText: "too short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a missing jobDescriptionText field", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/ai/analyze-job-description")
      .set("Authorization", authHeader())
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /ai/cover-letter without AI configured", () => {
  it("returns a clear 400 rather than a fake cover letter when no API key is set", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/ai/cover-letter")
      .set("Authorization", authHeader())
      .send({ jobId: "507f1f77bcf86cd799439011", tone: "professional" });
    // Reaches the service layer (past validation), which throws before any
    // DB/network call once it sees getLLMProvider() === null.
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not configured");
  });

  it("rejects an invalid tone value before reaching the service layer", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/ai/cover-letter")
      .set("Authorization", authHeader())
      .send({ jobId: "507f1f77bcf86cd799439011", tone: "sarcastic" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
