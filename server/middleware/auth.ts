import type { NextFunction, Request, Response } from 'express';
import { resolveSupabaseUser } from '../services/supabaseAuthService.js';

export function bearerTokenFromHeader(value: string | undefined): string | null {
    if (!value) return null;
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim() || null;
}

export async function attachUser(request: Request, _response: Response, next: NextFunction) {
    const token = bearerTokenFromHeader(request.get('authorization'));
    if (!token) {
        next();
        return;
    }
    try {
        request.user = await resolveSupabaseUser(token) ?? undefined;
    } catch {
        request.user = undefined;
    }
    next();
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
    if (!request.user) {
        response.status(401).json({ success: false, error: 'Authentication is required.' });
        return;
    }
    if (!request.user.emailVerified) {
        response.status(403).json({ success: false, error: 'Please verify your email before continuing.' });
        return;
    }
    next();
}
