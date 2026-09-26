import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDatabaseMode } from './database.js';

afterEach(() => {
    delete process.env.DATABASE_MODE;
    delete process.env.MONGODB_URI;
    vi.restoreAllMocks();
});

describe('database configuration', () => {
    it('defaults to deterministic mock mode', () => {
        expect(getDatabaseMode()).toBe('mock');
    });

    it('accepts explicit MongoDB mode without exposing the URI', () => {
        process.env.DATABASE_MODE = 'mongo';
        process.env.MONGODB_URI = 'mongodb://example.invalid/test';
        expect(getDatabaseMode()).toBe('mongo');
    });
});
