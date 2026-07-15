import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { bootstrapTestApp, createE2eUser, cleanupUser } from './test-helper';

describe('Transactions (e2e)', () => {
  let app: INestApplication<App>;
  let userA: { userId: string; token: string; authHeader: string };
  let userB: { userId: string; token: string; authHeader: string };
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const emailA = `e2e-a-${randomSuffix}@dompetrack-test.com`;
  const emailB = `e2e-b-${randomSuffix}@dompetrack-test.com`;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    // Create two separate test users for isolation tests
    userA = await createE2eUser(app, emailA, 'User A');
    userB = await createE2eUser(app, emailB, 'User B');
  });

  afterAll(async () => {
    // Cascade delete users and all their associated records
    if (userA?.userId) await cleanupUser(app, userA.userId);
    if (userB?.userId) await cleanupUser(app, userB.userId);
    await app.close();
  });

  describe('Full Transaction Workflow & Isolation', () => {
    let categoryIdA: string;
    let transactionIdA: string;

    it('should retrieve default categories created during user A registration', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories')
        .set('Authorization', userA.authHeader)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      categoryIdA = res.body.data[0].id;
    });

    it('should allow user A to create an expense transaction', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', userA.authHeader)
        .send({
          type: 'EXPENSE',
          amount: 75000,
          description: 'Lunch expense e2e',
          date: new Date().toISOString(),
          categoryId: categoryIdA,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(75000);
      expect(res.body.data.description).toBe('Lunch expense e2e');
      transactionIdA = res.body.data.id;
    });

    it('should allow user A to create an income transaction with no category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', userA.authHeader)
        .send({
          type: 'INCOME',
          amount: 250000,
          description: 'Freelance pay e2e',
          date: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(250000);
    });

    it('should list all transactions belonging to User A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', userA.authHeader)
        .expect(200);

      expect(res.body.success).toBe(true);
      const items = Array.isArray(res.body.data)
        ? res.body.data
        : res.body.data.transactions;
      expect(items.length).toBe(2);
    });

    it('should support pagination query parameters limit and page', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions?limit=1&page=2')
        .set('Authorization', userA.authHeader)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions.length).toBe(1);
      expect(res.body.data.pagination).toEqual({
        total: 2,
        page: 2,
        limit: 1,
        totalPages: 2,
      });
    });

    it('should return empty transaction list for new User B', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', userB.authHeader)
        .expect(200);

      expect(res.body.success).toBe(true);
      const items = Array.isArray(res.body.data)
        ? res.body.data
        : res.body.data.transactions;
      expect(items.length).toBe(0);
    });

    it("should reject User B trying to update User A's transaction (403 Forbidden)", async () => {
      await request(app.getHttpServer())
        .patch(`/api/transactions/${transactionIdA}`)
        .set('Authorization', userB.authHeader)
        .send({
          amount: 90000,
        })
        .expect(403);
    });

    it("should reject User B trying to delete User A's transaction (403 Forbidden)", async () => {
      await request(app.getHttpServer())
        .delete(`/api/transactions/${transactionIdA}`)
        .set('Authorization', userB.authHeader)
        .expect(403);
    });

    it('should allow User A to update their own transaction', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/transactions/${transactionIdA}`)
        .set('Authorization', userA.authHeader)
        .send({
          description: 'Lunch expense updated e2e',
          amount: 80000,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Lunch expense updated e2e');
      expect(res.body.data.amount).toBe(80000);
    });

    it('should allow User A to delete their own transaction', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/transactions/${transactionIdA}`)
        .set('Authorization', userA.authHeader)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Transaksi berhasil dihapus');
    });
  });
});
