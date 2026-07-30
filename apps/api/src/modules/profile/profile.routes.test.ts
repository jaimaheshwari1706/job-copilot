import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("profile routes require authentication", () => {
  it("GET /profile rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/profile");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /profile rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).patch("/profile").send({ name: "Test" });
    expect(res.status).toBe(401);
  });

  it("POST /profile/skills/confirm rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/profile/skills/confirm")
      .send({ skillNames: ["React"] });
    expect(res.status).toBe(401);
  });

  it("PATCH /profile/onboarding rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).patch("/profile/onboarding").send({ name: "Test" });
    expect(res.status).toBe(401);
  });

  it("POST /profile/onboarding/complete rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/profile/onboarding/complete").send({ name: "Test" });
    expect(res.status).toBe(401);
  });

  it("rejects a garbage access token on a protected profile route", async () => {
    const app = createApp();
    const res = await request(app).get("/profile").set("Authorization", "Bearer garbage.token.here");
    expect(res.status).toBe(401);
  });
});
