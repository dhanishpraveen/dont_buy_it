import 'dotenv/config';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectToDatabase, getDatabaseMode } from '../config/database.js';
import { mockAccessOptions } from '../../shared/data/mockAccessOptions.js';
import { UserModel } from '../models/User.js';
import { ItemModel } from '../models/Item.js';
import { ListingModel } from '../models/Listing.js';

const userIds = new Map<string, Types.ObjectId>();
const itemIds = new Map<string, Types.ObjectId>();

function stableId(seed: string): Types.ObjectId {
    return new Types.ObjectId(createHash('sha256').update(seed).digest('hex').slice(0, 24));
}

async function seed() {
    if (getDatabaseMode() !== 'mongo') throw new Error('Set DATABASE_MODE=mongo before running the seed command.');
    await connectToDatabase();

    const providerNames = [...new Set(mockAccessOptions.map((option) => option.provider.name))];
    for (const name of providerNames) {
        const id = stableId(`user${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18)}`);
        userIds.set(name, id);
        await UserModel.updateOne({ _id: id }, { _id: id, name, email: `${id.toString()}@demo.dontbuyit.local`, passwordHash: await bcrypt.hash('demo-password', 10), trustSummary: { score: 4.5, completedExchanges: 12, reviewCount: 8 } }, { upsert: true });
    }

    const itemKeys = [...new Set(mockAccessOptions.map((option) => option.itemId))];
    for (const itemKey of itemKeys) {
        const example = mockAccessOptions.find((option) => option.itemId === itemKey)!;
        const id = stableId(`item${itemKey.replace(/[^a-z0-9]/g, '').slice(0, 19)}`);
        itemIds.set(itemKey, id);
        await ItemModel.updateOne({ _id: id }, { _id: id, name: example.title, description: example.description, category: example.category, images: [example.image], condition: example.condition, capabilities: example.capabilities, owner: userIds.get(example.provider.name), metadata: { itemKey } }, { upsert: true });
    }

    await ListingModel.deleteMany({ metadata: { seed: 'phase-11' } });
    await ListingModel.insertMany(mockAccessOptions.map((option) => ({
        item: itemIds.get(option.itemId),
        owner: userIds.get(option.provider.name),
        accessType: option.accessMethod,
        price: option.price,
        priceUnit: option.priceUnit,
        totalCost: option.totalCost,
        availability: option.availability,
        availableFrom: option.availableFrom,
        availableUntil: option.availableUntil,
        location: option.location,
        distanceKm: option.distanceKm,
        condition: option.condition,
        conditionScore: option.conditionScore,
        trustScore: option.trustScore,
        convenienceScore: option.convenienceScore,
        usageSuitabilityScore: option.usageSuitabilityScore,
        status: 'active',
        metadata: { seed: 'phase-11', tags: option.metadata.tags },
    })));

    console.log(`[DB] Seeded ${mockAccessOptions.length} deterministic listings.`);
    process.exitCode = 0;
}

seed().catch((error) => {
    console.error('[DB] Seed failed.', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
