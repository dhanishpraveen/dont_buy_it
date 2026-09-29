// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthPage } from './AuthPage';

const authMocks = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ ...authMocks, loading: false, user: null, isAuthenticated: false }) }));

function renderAuth(path: '/login' | '/signup') {
    return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/signup" element={<AuthPage mode="register" />} /><Route path="/dashboard" element={<p>Dashboard</p>} /><Route path="/verify-otp" element={<p>Verify account</p>} /></Routes></MemoryRouter>);
}

describe('Supabase authentication forms', () => {
    beforeEach(() => {
        authMocks.signIn.mockReset();
        authMocks.signUp.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    it('renders Sign In with email, password, and recovery link', () => {
        renderAuth('/login');
        expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    });

    it('renders all required Sign Up fields', () => {
        renderAuth('/signup');
        expect(screen.getByLabelText('Full name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
        expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument();
    });

    it('rejects mismatched passwords without calling Supabase signup', async () => {
        renderAuth('/signup');
        fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'good-password-1' } });
        fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'different-password' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
        expect(authMocks.signUp).not.toHaveBeenCalled();
    });

    it('routes sign-up to verification', async () => {
        authMocks.signUp.mockResolvedValue(undefined);
        const { unmount } = renderAuth('/signup');
        fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'good-password-1' } });
        fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'good-password-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
        expect(await screen.findByText('Verify account')).toBeInTheDocument();
        unmount();
    });

    it('signs users in and routes them to dashboard', async () => {
        authMocks.signIn.mockResolvedValue({ emailVerified: true, email: 'asha@example.com' });
        renderAuth('/login');
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'asha@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'good-password-1' } });
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
        await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    });
});
