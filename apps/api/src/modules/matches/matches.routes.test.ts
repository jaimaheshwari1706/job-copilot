import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("match routes require authentication", () => {
  it("GET /matches/:jobId rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/matches/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });
});
