import { ArrowRight, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function ForgotPasswordPage() {
    const { sendPasswordRecovery } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await sendPasswordRecovery(email);
            setSent(true);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to send a reset link right now.');
        } finally {
            setSubmitting(false);
        }
    };

    return <div className="mx-auto max-w-xl px-6 py-12"><Card className="p-6 sm:p-8"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage"><Mail size={21} /></div><h1 className="mt-5 font-display text-3xl font-semibold text-ink">Reset your password</h1><p className="mt-2 text-sm leading-6 text-muted">We’ll send a secure reset link to your account email.</p>{sent ? <p className="mt-6 rounded-control bg-sage-soft px-3 py-2 text-sm font-semibold text-sage" role="status">If an account matches this email, a reset link is on its way.</p> : <form onSubmit={submit} className="mt-7 grid gap-4"><Input label="Email" id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />{error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}<Button type="submit" disabled={submitting}>{submitting ? 'Sending reset link...' : 'Send reset link'}{!submitting ? <ArrowRight size={17} /> : null}</Button></form>}<p className="mt-6 text-center text-sm text-muted"><Link className="font-semibold text-bark hover:underline" to="/login">Back to Sign In</Link></p></Card></div>;
}
