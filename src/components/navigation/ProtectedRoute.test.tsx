// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

const authState = vi.hoisted(() => ({ loading: false, user: null as { id: string; email?: string } | null, isAuthenticated: false, isEmailVerified: false }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => authState }));

function renderRoute() {
    return render(<MemoryRouter initialEntries={['/private']}><Routes><Route path="/private" element={<ProtectedRoute><p>Private content</p></ProtectedRoute>} /><Route path="/login" element={<p>Sign In</p>} /><Route path="/verify-otp" element={<p>Verify account</p>} /></Routes></MemoryRouter>);
}

describe('ProtectedRoute', () => {
    afterEach(() => {
        cleanup();
    });

    it('redirects unauthenticated users to Sign In', () => {
        authState.loading = false;
        authState.user = null;
        authState.isAuthenticated = false;
        renderRoute();
        expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('routes signed-in but unverified users to verification', () => {
        authState.loading = false;
        authState.user = { id: 'test-user', email: 'test@example.com' };
        authState.isAuthenticated = false;
        authState.isEmailVerified = false;
        renderRoute();
        expect(screen.getByText('Verify account')).toBeInTheDocument();
    });

    it('renders protected content for authenticated users', () => {
        authState.loading = false;
        authState.user = { id: 'test-user', email: 'test@example.com' };
        authState.isAuthenticated = true;
        authState.isEmailVerified = true;
        renderRoute();
        expect(screen.getByText('Private content')).toBeInTheDocument();
    });
});
