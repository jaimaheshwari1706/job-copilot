import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("application routes require authentication", () => {
  it("GET /applications rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/applications");
    expect(res.status).toBe(401);
  });

  it("POST /applications rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/applications")
      .send({ jobSnapshot: { title: "x", company: "y" } });
    expect(res.status).toBe(401);
  });

  it("GET /applications/:id rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/applications/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });

  it("PATCH /applications/:id rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app)
      .patch("/applications/507f1f77bcf86cd799439011")
      .send({ status: "applied" });
    expect(res.status).toBe(401);
  });

  it("POST /applications/:id/notes rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/applications/507f1f77bcf86cd799439011/notes")
      .send({ content: "note" });
    expect(res.status).toBe(401);
  });
});
