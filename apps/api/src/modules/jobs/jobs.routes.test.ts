import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("job routes require authentication", () => {
  it("GET /jobs rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/jobs");
    expect(res.status).toBe(401);
  });

  it("GET /jobs/saved rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/jobs/saved");
    expect(res.status).toBe(401);
  });

  it("GET /jobs/:id rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/jobs/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });

  it("GET /jobs/recommended rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/jobs/recommended");
    expect(res.status).toBe(401);
  });

  it("POST /jobs/:id/save rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/jobs/507f1f77bcf86cd799439011/save");
    expect(res.status).toBe(401);
  });

  it("POST /jobs/:id/hide rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/jobs/507f1f77bcf86cd799439011/hide");
    expect(res.status).toBe(401);
  });
});

describe("job admin routes require both authentication and admin role", () => {
  it("POST /jobs/admin/ingest rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/jobs/admin/ingest").send({ provider: "demo" });
    expect(res.status).toBe(401);
  });

  it("GET /jobs/admin/ingestion-runs rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/jobs/admin/ingestion-runs");
    expect(res.status).toBe(401);
  });
});
