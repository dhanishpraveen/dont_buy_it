import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

type AuthPageProps = { mode: 'login' | 'register' };

export function AuthPage({ mode }: AuthPageProps) {
    const isRegister = mode === 'register';
    const navigate = useNavigate();
    const location = useLocation();
    const { login, register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            if (isRegister) await register({ name, email, password, phone: phone || undefined });
            else await login(email, password);
            const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
            navigate(destination, { replace: true });
        } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : 'We could not complete that request.');
        } finally {
            setSubmitting(false);
        }
    };

    return <div className="mx-auto grid min-h-[calc(100vh-144px)] max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_440px] lg:px-10">
        <section className="hidden lg:block"><p className="font-handwritten text-3xl text-sage">A thoughtful place to begin</p><h1 className="mt-3 max-w-xl font-display text-5xl font-semibold leading-tight text-ink">Keep your access decisions close.</h1><p className="mt-5 max-w-lg text-base leading-7 text-muted">Create an account to keep your profile and future access activity together. The AI assistant remains available for exploring a need.</p></section>
        <Card className="p-6 sm:p-8"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage">{isRegister ? <UserRound size={21} /> : <LockKeyhole size={21} />}</div><h1 className="mt-5 font-display text-3xl font-semibold text-ink">{isRegister ? 'Create your account' : 'Welcome back'}</h1><p className="mt-2 text-sm leading-6 text-muted">{isRegister ? 'A simple account for your thoughtful access journey.' : 'Sign in to continue to your workspace.'}</p>
            <form onSubmit={submit} className="mt-7 grid gap-4">{isRegister ? <Input label="Name" id="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /> : null}<Input label="Email" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><Input label="Password" id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={8} required />{isRegister ? <Input label="Phone (optional)" id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" /> : null}{error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}<Button type="submit" disabled={submitting}>{submitting ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}{!submitting ? <ArrowRight size={17} /> : null}</Button></form>
            <p className="mt-6 text-center text-sm text-muted">{isRegister ? 'Already have an account?' : 'New to Don’t Buy It?'} <Link className="font-semibold text-bark hover:underline" to={isRegister ? '/login' : '/signup'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
        </Card>
    </div>;
}
