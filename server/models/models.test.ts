import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { AccessRequestModel, ListingModel, ReviewModel, UserModel } from './index.js';

describe('MongoDB model validation', () => {
    it('requires core user and listing fields', async () => {
        await expect(new UserModel({}).validate()).rejects.toThrow(/name/);
        await expect(new ListingModel({}).validate()).rejects.toThrow(/item/);
    });

    it('rejects invalid enum and rating values', async () => {
        const listing = new ListingModel({ accessType: 'invalid', price: 0, priceUnit: 'free', totalCost: 0, location: 'Chennai', distanceKm: 1, condition: 'Good', conditionScore: 80, trustScore: 4, convenienceScore: 80, usageSuitabilityScore: 80 });
        await expect(listing.validate()).rejects.toThrow(/accessType/);

        const review = new ReviewModel({ reviewer: new Types.ObjectId(), reviewedUser: new Types.ObjectId(), exchange: new Types.ObjectId(), rating: 7 });
        await expect(review.validate()).rejects.toThrow(/rating/);
    });

    it('accepts valid lifecycle enum values', async () => {
        const request = new AccessRequestModel({ requester: new Types.ObjectId(), listing: new Types.ObjectId(), accessType: 'borrow', status: 'pending' });
        await expect(request.validate()).resolves.toBeUndefined();
    });
});
