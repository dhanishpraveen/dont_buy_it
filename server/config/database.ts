import mongoose from 'mongoose';

export type DatabaseMode = 'mock' | 'mongo';

export function getDatabaseMode(): DatabaseMode {
    return process.env.DATABASE_MODE?.trim().toLowerCase() === 'mongo' ? 'mongo' : 'mock';
}

export async function connectToDatabase(): Promise<void> {
    if (getDatabaseMode() === 'mock') {
        console.log('[DB] Using deterministic mock data mode.');
        return;
    }

    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MONGODB_URI is required when DATABASE_MODE=mongo.');
    if (mongoose.connection.readyState === 1) return;

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('[DB] MongoDB connected.');
    } catch (error) {
        console.error('[DB] MongoDB connection failed.', error instanceof Error ? error.message : 'unknown error');
        throw new Error('MongoDB connection failed. Check MONGODB_URI and database availability.');
    }
}

export async function disconnectFromDatabase(): Promise<void> {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
