import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("POST /auth/register", () => {
  it("rejects an invalid email with a validation error, before touching the database", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "longenoughpassword" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a too-short password", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.details?.password).toBeDefined();
  });
});

describe("POST /auth/login", () => {
  it("rejects a missing password", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/login").send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me", () => {
  it("rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a garbage access token", async () => {
    const app = createApp();
    const res = await request(app).get("/auth/me").set("Authorization", "Bearer garbage.token.here");
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/refresh", () => {
  it("rejects a request with no refresh cookie", async () => {
    const app = createApp();
    const res = await request(app).post("/auth/refresh");
    expect(res.status).toBe(401);
  });
});
