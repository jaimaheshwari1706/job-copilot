import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("resume routes require authentication", () => {
  it("GET /resumes rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/resumes");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /resumes rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).post("/resumes").attach("file", Buffer.from("x"), "r.pdf");
    expect(res.status).toBe(401);
  });

  it("GET /resumes/:id rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/resumes/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });

  it("DELETE /resumes/:id rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).delete("/resumes/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });

  it("GET /resumes/:id/download-url rejects a request with no access token", async () => {
    const app = createApp();
    const res = await request(app).get("/resumes/507f1f77bcf86cd799439011/download-url");
    expect(res.status).toBe(401);
  });

  it("GET /resumes/:id/download does NOT require a session (signed token is the authorization) but rejects a missing token", async () => {
    const app = createApp();
    const res = await request(app).get("/resumes/507f1f77bcf86cd799439011/download");
    expect(res.status).toBe(400);
  });

  it("GET /resumes/:id/download rejects an invalid/forged token", async () => {
    const app = createApp();
    const res = await request(app).get(
      "/resumes/507f1f77bcf86cd799439011/download?token=fake.123.sig",
    );
    expect(res.status).toBe(401);
  });
});
