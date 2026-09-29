import { ArrowRight, MailCheck, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

export function OtpVerificationPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading, isEmailVerified, refreshSession, resendEmailVerification, signOut } = useAuth();
    const routeState = location.state as { email?: string } | null;
    const [email, setEmail] = useState(routeState?.email ?? user?.email ?? '');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        void refreshSession().catch((refreshError) => setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh verification status.'));
    }, [refreshSession]);

    const resendEmail = async () => {
        setError(null);
        setNotice(null);
        setSending(true);
        try {
            if (!email.trim()) throw new Error('Enter the email address used to create your account.');
            await resendEmailVerification(email.trim());
            setNotice('A verification link has been sent. Open it, then return here to continue.');
        } catch (resendError) {
            setError(resendError instanceof Error ? resendError.message : 'Unable to resend the verification email.');
        } finally {
            setSending(false);
        }
    };

    const continueToSignIn = async () => {
        await signOut();
        navigate('/login', { replace: true, state: { verified: true, email } });
    };

    return <div className="mx-auto max-w-xl px-6 py-12">
        <Card className="p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage"><ShieldCheck size={21} /></div>
            <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Verify your account</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Email verification is required before you can sign in and use the app.</p>

            {loading ? <p className="mt-5 text-sm text-muted" role="status">Checking verification status...</p> : null}
            {!loading && !isEmailVerified ? <section className="mt-6 rounded-card border border-line bg-surface p-5">
                <div className="flex items-center gap-3 text-sage"><MailCheck size={18} /><h2 className="font-display text-xl font-semibold text-ink">Check your email</h2></div>
                <p className="mt-3 text-sm leading-6 text-muted">We’ve sent a verification link to {email || user?.email || 'your email address'}. Open the link and return to continue.</p>
                {error ? <p className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
                {notice ? <p className="mt-4 rounded-control bg-sage-soft px-3 py-2 text-sm font-semibold text-sage" role="status">{notice}</p> : null}
                <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={() => void refreshSession().then(() => setNotice('Verification status refreshed.')).catch((refreshError) => setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh status.'))}>I verified my email</Button>
                    <Button variant="secondary" onClick={() => void resendEmail()} disabled={sending}>{sending ? 'Sending email...' : 'Resend verification email'}</Button>
                </div>
            </section> : null}

            {!loading && isEmailVerified ? <section className="mt-6 rounded-card border border-sage bg-sage-soft p-5">
                <h2 className="font-display text-xl font-semibold text-ink">Email verified</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Your email is verified. Please sign in with your email and password.</p>
                <Button className="mt-4" onClick={() => void continueToSignIn()}>Continue to Sign In <ArrowRight size={17} /></Button>
            </section> : null}

            <p className="mt-6 text-center text-sm text-muted"><Link className="font-semibold text-bark hover:underline" to="/login">Back to Sign In</Link></p>
        </Card>
    </div>;
}
