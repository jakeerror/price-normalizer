import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { CREDS, createTestApp, loginToken } from "./app-factory";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => app.getHttpServer();

  it("logs in with valid credentials", async () => {
    const res = await request(http()).post("/api/v1/auth/login").send(CREDS.operator);
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.tokenType).toBe("bearer");
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(http())
      .post("/api/v1/auth/login")
      .send({ email: CREDS.operator.email, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns the current user and never leaks the password hash", async () => {
    const token = await loginToken(app, "operator");
    const res = await request(http())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(CREDS.operator.email);
    expect(res.body.role).toBe("operator");
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("blocks protected routes without a token (401)", async () => {
    const res = await request(http()).get("/api/v1/batches");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token (401)", async () => {
    const res = await request(http())
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });
});
