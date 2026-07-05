import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";

import { createTestApp, loginToken, seedProduct } from "./app-factory";

const CSV =
  "наименование;цена;артикул;ед\n" +
  "Цемент М500 мешок;450,50;CEM500;шт\n" +
  "Загадочный товар XYZ;100;;шт\n";

describe("Pipeline (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;
  let supplierId: number;
  let operator: string;
  let viewer: string;

  beforeAll(async () => {
    ({ app, ds, supplierId } = await createTestApp());
    operator = await loginToken(app, "operator");
    viewer = await loginToken(app, "viewer");
    await seedProduct(ds, "Цемент М500", "CEM500", "Вяжущие", "pack");
  });
  afterAll(async () => {
    await app.close();
  });

  const http = () => app.getHttpServer();
  const upload = (token: string) =>
    request(http())
      .post("/api/v1/batches")
      .set("Authorization", `Bearer ${token}`)
      .field("supplierId", String(supplierId))
      .attach("file", Buffer.from(CSV), "price.csv");

  it("forbids a viewer from uploading (403)", async () => {
    const res = await upload(viewer);
    expect(res.status).toBe(403);
  });

  let batchId: number;
  let offerId: number;

  it("parses, normalizes and matches an uploaded price list", async () => {
    const res = await upload(operator);
    expect(res.status).toBe(202);
    expect(res.body.status).toBe("needs_review");
    expect(res.body.totalRows).toBe(2);
    expect(res.body.matchedCount).toBe(1); // matched by article
    expect(res.body.reviewCount).toBe(1); // unknown item
    batchId = res.body.id;
  });

  it("rejects an illegal stage transition with 409", async () => {
    const res = await request(http())
      .post(`/api/v1/batches/${batchId}/transition`)
      .set("Authorization", `Bearer ${operator}`)
      .send({ action: "finish_review" });
    expect(res.status).toBe(409); // one offer still needs review
  });

  it("lists offers awaiting review", async () => {
    const res = await request(http())
      .get(`/api/v1/batches/${batchId}/offers?status=needs_review`)
      .set("Authorization", `Bearer ${operator}`);
    expect(res.body).toHaveLength(1);
    offerId = res.body[0].id;
  });

  it("resolving the last offer auto-completes the batch", async () => {
    const resolve = await request(http())
      .post(`/api/v1/offers/${offerId}/resolve`)
      .set("Authorization", `Bearer ${operator}`)
      .send({ action: "reject" });
    expect(resolve.status).toBe(201);

    const batch = await request(http())
      .get(`/api/v1/batches/${batchId}`)
      .set("Authorization", `Bearer ${operator}`);
    expect(batch.body.status).toBe("completed");
    expect(batch.body.reviewCount).toBe(0);
  });

  it("resolving an already-resolved offer returns 409", async () => {
    const res = await request(http())
      .post(`/api/v1/offers/${offerId}/resolve`)
      .set("Authorization", `Bearer ${operator}`)
      .send({ action: "reject" });
    expect(res.status).toBe(409);
  });

  it("place_order-style export returns the matched catalog", async () => {
    const res = await request(http())
      .get("/api/v1/export/catalog")
      .set("Authorization", `Bearer ${operator}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].article).toBe("CEM500");
  });

  it("forbids deleting a supplier referenced by a batch (409)", async () => {
    const res = await request(http())
      .delete(`/api/v1/suppliers/${supplierId}`)
      .set("Authorization", `Bearer ${operator}`);
    expect(res.status).toBe(409);
  });
});
