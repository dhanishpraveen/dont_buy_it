import { Router } from 'express';
import { authCookieName, requireAuth } from '../middleware/auth.js';
import { loginUser, registerUser, updateUserProfile } from '../services/authService.js';

const router = Router();
const cookieOptions = (maxAge: number) => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

router.post('/register', async (request, response) => {
    const { name, email, password, phone } = request.body ?? {};
    try {
        const result = await registerUser({ name, email, password, phone });
        response.setHeader('Set-Cookie', `${authCookieName}=${encodeURIComponent(result.token)}; ${cookieOptions(60 * 60 * 24 * 7)}`);
        response.status(201).json({ success: true, data: result.user });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'We could not create your account.';
        response.status(message.includes('already exists') ? 409 : 400).json({ success: false, error: message });
    }
});

router.post('/login', async (request, response) => {
    const { email, password } = request.body ?? {};
    try {
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) throw new Error('Enter your email and password.');
        const result = await loginUser(email, password);
        response.setHeader('Set-Cookie', `${authCookieName}=${encodeURIComponent(result.token)}; ${cookieOptions(60 * 60 * 24 * 7)}`);
        response.json({ success: true, data: result.user });
    } catch {
        response.status(401).json({ success: false, error: 'Invalid email or password.' });
    }
});

router.post('/logout', (_request, response) => {
    response.setHeader('Set-Cookie', `${authCookieName}=; ${cookieOptions(0)}`);
    response.json({ success: true });
});

router.get('/me', requireAuth, (request, response) => {
    response.json({ success: true, data: request.user });
});

router.patch('/me', requireAuth, async (request, response) => {
    try {
        const user = await updateUserProfile(request.user!.id, request.body ?? {});
        response.json({ success: true, data: user });
    } catch (error) {
        response.status(400).json({ success: false, error: error instanceof Error ? error.message : 'We could not update your profile.' });
    }
});

export { router as authRouter };
