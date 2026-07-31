import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("notification routes require authentication", () => {
  it("GET /notifications rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });

  it("PATCH /notifications/:id/read rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).patch("/notifications/507f1f77bcf86cd799439011/read");
    expect(res.status).toBe(401);
  });
});
