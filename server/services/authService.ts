import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { getDatabaseMode } from '../config/database.js';
import { UserModel } from '../models/User.js';

const { sign, verify } = jwt;
const MOCK_SECRET = 'development-only-auth-secret';
const passwordRounds = 12;

export type PublicUser = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    location?: string;
    approximateLocation?: string;
    verificationStatus: 'unverified' | 'pending' | 'verified';
    trustSummary: { score: number; completedExchanges: number; reviewCount: number };
    createdAt: string;
    updatedAt: string;
};

type AuthUser = PublicUser & { passwordHash: string };
type UserInput = { name: string; email: string; password: string; phone?: string };
type ProfileInput = { name?: string; phone?: string; profileImage?: string; location?: string; approximateLocation?: string };

const mockUsers = new Map<string, AuthUser>();

function jwtSecret(): string {
    const configured = process.env.JWT_SECRET?.trim();
    if (configured) return configured;
    if (getDatabaseMode() === 'mock') return MOCK_SECRET;
    throw new Error('JWT_SECRET is required when DATABASE_MODE=mongo.');
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function validateUserInput(input: UserInput): void {
    if (!input.name?.trim() || input.name.trim().length < 2) throw new Error('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Enter a valid email address.');
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (input.phone && input.phone.length > 40) throw new Error('Enter a valid phone number.');
}

function toPublicUser(user: Record<string, unknown>): PublicUser {
    const trust = user.trustSummary && typeof user.trustSummary === 'object' ? user.trustSummary as Record<string, unknown> : {};
    return {
        id: String(user._id ?? user.id),
        name: String(user.name),
        email: String(user.email),
        phone: typeof user.phone === 'string' ? user.phone : undefined,
        profileImage: typeof user.profileImage === 'string' ? user.profileImage : undefined,
        location: typeof user.location === 'string' ? user.location : undefined,
        approximateLocation: typeof user.approximateLocation === 'string' ? user.approximateLocation : undefined,
        verificationStatus: user.verificationStatus === 'pending' || user.verificationStatus === 'verified' ? user.verificationStatus : 'unverified',
        trustSummary: { score: typeof trust.score === 'number' ? trust.score : 0, completedExchanges: typeof trust.completedExchanges === 'number' ? trust.completedExchanges : 0, reviewCount: typeof trust.reviewCount === 'number' ? trust.reviewCount : 0 },
        createdAt: new Date(String(user.createdAt)).toISOString(),
        updatedAt: new Date(String(user.updatedAt)).toISOString(),
    };
}

function toAuthUser(user: Record<string, unknown>): AuthUser {
    return { ...toPublicUser(user), passwordHash: String(user.passwordHash) };
}

function tokenFor(user: PublicUser): string {
    return sign({ sub: user.id }, jwtSecret(), { expiresIn: '7d' });
}

function findMockByEmail(email: string): AuthUser | undefined {
    return [...mockUsers.values()].find((user) => user.email === email);
}

export async function registerUser(input: UserInput): Promise<{ user: PublicUser; token: string }> {
    validateUserInput(input);
    const email = normalizeEmail(input.email);
    if (getDatabaseMode() === 'mock') {
        if (findMockByEmail(email)) throw new Error('An account with that email already exists.');
        const now = new Date().toISOString();
        const user: AuthUser = { id: randomUUID(), name: input.name.trim(), email, passwordHash: await bcrypt.hash(input.password, passwordRounds), phone: input.phone?.trim(), verificationStatus: 'unverified', trustSummary: { score: 0, completedExchanges: 0, reviewCount: 0 }, createdAt: now, updatedAt: now };
        mockUsers.set(user.id, user);
        return { user: toPublicUser(user), token: tokenFor(user) };
    }

    const existing = await UserModel.findOne({ email }).select('+passwordHash').lean();
    if (existing) throw new Error('An account with that email already exists.');
    const created = await UserModel.create({ name: input.name.trim(), email, passwordHash: await bcrypt.hash(input.password, passwordRounds), phone: input.phone?.trim() });
    const user = toPublicUser(created.toObject() as Record<string, unknown>);
    return { user, token: tokenFor(user) };
}

export async function loginUser(emailInput: string, password: string): Promise<{ user: PublicUser; token: string }> {
    const email = normalizeEmail(emailInput);
    let user: AuthUser | null = null;
    if (getDatabaseMode() === 'mock') user = findMockByEmail(email) ?? null;
    else {
        const found = await UserModel.findOne({ email }).select('+passwordHash').lean();
        user = found ? toAuthUser(found as unknown as Record<string, unknown>) : null;
    }
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error('Invalid email or password.');
    const now = new Date().toISOString();
    user.updatedAt = now;
    if (getDatabaseMode() === 'mongo') await UserModel.updateOne({ _id: user.id }, { $set: { lastLoginAt: now } });
    else mockUsers.set(user.id, user);
    return { user: toPublicUser(user), token: tokenFor(user) };
}

export async function userFromToken(token: string): Promise<PublicUser | null> {
    try {
        const payload = verify(token, jwtSecret()) as { sub?: string };
        if (!payload.sub) return null;
        if (getDatabaseMode() === 'mock') {
            const user = mockUsers.get(payload.sub);
            return user ? toPublicUser(user) : null;
        }
        const user = await UserModel.findById(payload.sub).lean();
        return user ? toPublicUser(user as unknown as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

export async function updateUserProfile(userId: string, input: ProfileInput): Promise<PublicUser> {
    if (input.name !== undefined && (input.name.trim().length < 2 || input.name.length > 120)) throw new Error('Name must be between 2 and 120 characters.');
    if (input.phone !== undefined && input.phone.length > 40) throw new Error('Enter a valid phone number.');
    const editableFields: Array<keyof ProfileInput> = ['name', 'phone', 'profileImage', 'location', 'approximateLocation'];
    const changes = Object.fromEntries(editableFields.filter((key) => input[key] !== undefined).map((key) => [key, typeof input[key] === 'string' ? input[key]!.trim() : input[key]]));
    if (getDatabaseMode() === 'mock') {
        const user = mockUsers.get(userId);
        if (!user) throw new Error('User not found.');
        Object.assign(user, changes, { updatedAt: new Date().toISOString() });
        mockUsers.set(userId, user);
        return toPublicUser(user);
    }
    const updated = await UserModel.findByIdAndUpdate(userId, { $set: changes }, { new: true, runValidators: true }).lean();
    if (!updated) throw new Error('User not found.');
    return toPublicUser(updated as unknown as Record<string, unknown>);
}

export function serializeUser(user: PublicUser): PublicUser {
    return user;
}
