import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("skills routes require authentication", () => {
  it("GET /skills/gap-analysis rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/skills/gap-analysis");
    expect(res.status).toBe(401);
  });
});
