import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const { updatePassword, signOut } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        setSubmitting(true);
        try {
            await updatePassword(password);
            await signOut();
            navigate('/login', { replace: true, state: { passwordReset: true } });
        } catch (updateError) {
            setError(updateError instanceof Error ? updateError.message : 'Unable to reset the password.');
        } finally {
            setSubmitting(false);
        }
    };

    return <div className="mx-auto max-w-xl px-6 py-12"><Card className="p-6 sm:p-8"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage"><LockKeyhole size={21} /></div><h1 className="mt-5 font-display text-3xl font-semibold text-ink">Choose a new password</h1><p className="mt-2 text-sm leading-6 text-muted">Use at least 8 characters, then sign in with your new password.</p><form onSubmit={submit} className="mt-7 grid gap-4"><Input label="New password" id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /><Input label="Confirm new password" id="confirm-new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />{error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}<Button type="submit" disabled={submitting}>{submitting ? 'Updating password...' : 'Update password'}{!submitting ? <ArrowRight size={17} /> : null}</Button></form><p className="mt-6 text-center text-sm text-muted"><Link className="font-semibold text-bark hover:underline" to="/login">Back to Sign In</Link></p></Card></div>;
}
