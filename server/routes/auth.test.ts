import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

process.env.DATABASE_MODE = 'mock';

const uniqueEmail = () => `auth-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

describe('authentication API', () => {
    it('rejects unauthenticated profile access', async () => {
        const response = await request(app).get('/api/auth/me');
        expect(response.status).toBe(401);
        expect(response.body).toEqual({ success: false, error: 'Authentication is required.' });
    });

    it('registers a user, authenticates the cookie, and never returns a password', async () => {
        const agent = request.agent(app);
        const email = uniqueEmail();
        const registration = await agent.post('/api/auth/register').send({ name: 'Asha Rao', email, password: 'strong-pass-123', phone: '9876543210' });
        expect(registration.status).toBe(201);
        expect(registration.headers['set-cookie']?.[0]).toContain('HttpOnly');
        expect(registration.body.data).toMatchObject({ name: 'Asha Rao', email, phone: '9876543210' });
        expect(registration.body.data).not.toHaveProperty('passwordHash');

        const profile = await agent.get('/api/auth/me');
        expect(profile.status).toBe(200);
        expect(profile.body.data.email).toBe(email);
        expect(profile.body.data).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate and invalid registration safely', async () => {
        const email = uniqueEmail();
        await request(app).post('/api/auth/register').send({ name: 'First User', email, password: 'strong-pass-123' }).expect(201);
        const duplicate = await request(app).post('/api/auth/register').send({ name: 'Second User', email, password: 'strong-pass-123' });
        expect(duplicate.status).toBe(409);
        const invalid = await request(app).post('/api/auth/register').send({ name: 'A', email: 'invalid', password: 'short' });
        expect(invalid.status).toBe(400);
    });

    it('logs in, updates only the authenticated profile, and logs out', async () => {
        const agent = request.agent(app);
        const email = uniqueEmail();
        await agent.post('/api/auth/register').send({ name: 'Profile User', email, password: 'strong-pass-123' }).expect(201);
        const invalid = await request(app).post('/api/auth/login').send({ email, password: 'wrong-pass-123' });
        expect(invalid.status).toBe(401);
        await agent.post('/api/auth/login').send({ email, password: 'strong-pass-123' }).expect(200);
        const updated = await agent.patch('/api/auth/me').send({ name: 'Updated User', location: 'Chennai' });
        expect(updated.status).toBe(200);
        expect(updated.body.data).toMatchObject({ name: 'Updated User', location: 'Chennai' });
        expect(updated.body.data).not.toHaveProperty('passwordHash');
        await agent.post('/api/auth/logout').expect(200);
        await agent.get('/api/auth/me').expect(401);
    });

    it('does not allow invalid private profile fields', async () => {
        const agent = request.agent(app);
        const email = uniqueEmail();
        await agent.post('/api/auth/register').send({ name: 'Safe User', email, password: 'strong-pass-123' }).expect(201);
        const response = await agent.patch('/api/auth/me').send({ name: 'x' });
        expect(response.status).toBe(400);

        const protectedFields = await agent.patch('/api/auth/me').send({ email: 'changed@example.com', passwordHash: 'not-a-password-hash', trustSummary: { score: 5 } });
        expect(protectedFields.status).toBe(200);
        expect(protectedFields.body.data.email).toBe(email);
        expect(protectedFields.body.data).not.toHaveProperty('passwordHash');
    });
});
