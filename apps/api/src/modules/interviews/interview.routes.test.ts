import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { signAccessToken } from "../auth/jwt.js";

function authHeader() {
  const token = signAccessToken({ sub: "507f1f77bcf86cd799439011", email: "test@example.com" });
  return `Bearer ${token}`;
}

describe("interview routes require authentication", () => {
  it("GET /interview rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/interview");
    expect(res.status).toBe(401);
  });

  it("POST /interview/prep rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/interview/prep").send({});
    expect(res.status).toBe(401);
  });

  it("POST /interview/mock/start rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/interview/mock/start").send({});
    expect(res.status).toBe(401);
  });

  it("POST /interview/mock/:id/answer rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/interview/mock/507f1f77bcf86cd799439011/answer")
      .send({ answer: "test answer" });
    expect(res.status).toBe(401);
  });
});

describe("interview session start without AI configured", () => {
  it("POST /interview/prep returns a clear 400 rather than fake questions when no API key is set", async () => {
    const app = createApp();
    const res = await request(app).post("/interview/prep").set("Authorization", authHeader()).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not configured");
  });

  it("POST /interview/mock/start returns a clear 400 rather than a fake question when no API key is set", async () => {
    const app = createApp();
    const res = await request(app).post("/interview/mock/start").set("Authorization", authHeader()).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not configured");
  });
});

describe("POST /interview/prep validation", () => {
  it("rejects more than 9 categories", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/interview/prep")
      .set("Authorization", authHeader())
      .send({
        categories: [
          "javascript",
          "react",
          "nodejs",
          "database",
          "apis",
          "testing",
          "system_design",
          "behavioral",
          "project_specific",
          "javascript",
        ],
      });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid category value", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/interview/prep")
      .set("Authorization", authHeader())
      .send({ categories: ["cooking"] });
    expect(res.status).toBe(400);
  });
});

describe("POST /interview/mock/:id/answer validation", () => {
  it("rejects an empty answer", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/interview/mock/507f1f77bcf86cd799439011/answer")
      .set("Authorization", authHeader())
      .send({ answer: "" });
    expect(res.status).toBe(400);
  });
});
