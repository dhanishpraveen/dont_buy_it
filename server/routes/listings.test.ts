import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';

process.env.DATABASE_MODE = 'mock';
let sequence = 0;
const email = (label: string) => `listing-${label}-${Date.now()}-${sequence += 1}@example.com`;
const listingInput = { name: 'Community Projector', description: 'A compact projector for presentations and movie nights.', category: 'Electronics', images: ['https://example.com/projector.jpg'], condition: 'Good', capabilities: ['HDMI', 'display presentation slides'], accessType: 'borrow', price: 0, priceUnit: 'free', availability: 'available', location: 'Adyar, Chennai', availableFrom: 'tomorrow' };

async function register(label: string) {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({ name: label, email: email(label.toLowerCase().replace(/\s+/g, '-')), password: 'strong-pass-123' }).expect(201);
    return agent;
}

describe('listing API', () => {
    it('rejects unauthenticated creation and invalid pricing', async () => {
        await request(app).post('/api/listings').send(listingInput).expect(401);
        const agent = await register('Price Owner');
        const response = await agent.post('/api/listings').send({ ...listingInput, accessType: 'borrow', price: 100, priceUnit: 'one-time' });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('price of zero');
    });

    it('creates, browses, searches, updates, and soft-deletes an owned listing', async () => {
        const agent = await register('Listing Owner');
        const created = await agent.post('/api/listings').send(listingInput);
        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ item: { name: 'Community Projector', condition: 'Good' }, accessType: 'borrow', location: 'Adyar, Chennai', status: 'active' });
        expect(created.body.data.owner).not.toHaveProperty('email');
        const id = created.body.data.id;

        const publicList = await request(app).get('/api/listings').query({ search: 'projector' });
        expect(publicList.status).toBe(200);
        expect(publicList.body.data.some((listing: { id: string }) => listing.id === id)).toBe(true);
        await request(app).get(`/api/listings/${id}`).expect(200);
        const matched = await request(app).post('/api/resources/match').send({ requirement: { item: 'projector', purpose: 'presentation', duration: null, frequency: null, date: 'tomorrow', location: null, urgency: null, budget: null, requiredCapabilities: [] } });
        expect(matched.status).toBe(200);
        expect(matched.body.data.some((option: { id: string }) => option.id === id)).toBe(true);

        const mine = await agent.get('/api/users/me/listings');
        expect(mine.status).toBe(200);
        expect(mine.body.data.some((listing: { id: string }) => listing.id === id)).toBe(true);

        const updated = await agent.patch(`/api/listings/${id}`).send({ status: 'paused', location: 'Besant Nagar, Chennai' });
        expect(updated.status).toBe(200);
        expect(updated.body.data.status).toBe('paused');
        expect(updated.body.data.location).toBe('Besant Nagar, Chennai');
        const hidden = await request(app).get(`/api/listings/${id}`);
        expect(hidden.status).toBe(404);

        await agent.delete(`/api/listings/${id}`).expect(200);
        expect((await agent.get('/api/users/me/listings')).body.data.find((listing: { id: string }) => listing.id === id).status).toBe('closed');
    });

    it('rejects another user from modifying a listing', async () => {
        const owner = await register('Owner');
        const otherUser = await register('Other User');
        const created = await owner.post('/api/listings').send({ ...listingInput, name: 'Owner Camera', category: 'Electronics' }).expect(201);
        const id = created.body.data.id;
        expect((await otherUser.patch(`/api/listings/${id}`).send({ name: 'Stolen Listing' })).status).toBe(403);
        expect((await otherUser.delete(`/api/listings/${id}`)).status).toBe(403);
    });
});
