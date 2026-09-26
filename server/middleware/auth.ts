import type { NextFunction, Request, Response } from 'express';
import { userFromToken } from '../services/authService.js';

export const authCookieName = process.env.AUTH_COOKIE_NAME?.trim() || 'dont_buy_it_session';

function readCookie(request: Request, name: string): string | null {
    const header = request.headers.cookie;
    if (!header) return null;
    const pair = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

export async function attachUser(request: Request, _response: Response, next: NextFunction) {
    const token = readCookie(request, authCookieName);
    if (token) request.user = await userFromToken(token) ?? undefined;
    next();
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
    if (!request.user) {
        response.status(401).json({ success: false, error: 'Authentication is required.' });
        return;
    }
    next();
}
