import { describe, expect, it } from 'vitest';
import { mockAccessOptions } from '../../shared/data/mockAccessOptions.js';

describe('Phase 11 seed contract', () => {
    it('contains deterministic demo listings for every access method', () => {
        const methods = new Set(mockAccessOptions.map((option) => option.accessMethod));
        expect(methods).toEqual(new Set(['borrow', 'rent', 'buy-used', 'buy-new']));
        expect(mockAccessOptions.length).toBeGreaterThan(10);
    });
});
