import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("dashboard routes require authentication", () => {
  it("GET /dashboard rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/dashboard");
    expect(res.status).toBe(401);
  });
});
