import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("alerts routes require authentication", () => {
  it("GET /alerts rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/alerts");
    expect(res.status).toBe(401);
  });

  it("POST /alerts rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/alerts").send({ name: "React roles", criteria: {} });
    expect(res.status).toBe(401);
  });
});
