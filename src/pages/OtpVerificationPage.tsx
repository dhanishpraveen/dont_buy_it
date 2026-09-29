import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

export function OtpVerificationPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { verifyOtp, resendOtp } = useAuth();
    const initialPhone = (location.state as { phone?: string } | null)?.phone ?? '';
    const [otp, setOtp] = useState('');
    const [phone, setPhone] = useState(initialPhone);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        setSubmitting(true);
        try {
            if (!phone.trim()) throw new Error('A valid phone number is required.');
            if (!/^\d{6}$/.test(otp.trim())) throw new Error('Enter a valid 6-digit code.');
            await verifyOtp(phone.trim(), otp.trim());
            setSuccess('Phone verification complete. Please check your email and sign in to continue.');
            setTimeout(() => navigate('/login', { replace: true }), 1200);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'The verification code is incorrect or expired.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        setSuccess(null);
        setResending(true);
        try {
            await resendOtp(phone.trim());
            setSuccess('A fresh verification code has been sent.');
        } catch (resendError) {
            setError(resendError instanceof Error ? resendError.message : 'We could not resend the code.');
        } finally {
            setResending(false);
        }
    };

    return <div className="mx-auto max-w-xl px-6 py-12">
        <Card className="p-6 sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage"><ShieldCheck size={21} /></div>
            <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Verify your phone</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Enter the 6-digit code sent to {phone ? `+${phone.replace(/\s+/g, '')}` : 'your phone number'}.</p>
            <form onSubmit={submit} className="mt-7 grid gap-4">
                <Input label="Phone number" id="verification-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
                <Input label="Verification code" id="otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="123456" autoComplete="one-time-code" required />
                {error ? <p className="rounded-control bg-red-50 px-3 py-2 text-sm font-semibold text-red-800" role="alert">{error}</p> : null}
                {success ? <p className="rounded-control bg-sage-soft px-3 py-2 text-sm font-semibold text-sage" role="status">{success}</p> : null}
                <Button type="submit" disabled={submitting}>{submitting ? 'Verifying code...' : 'Verify code'}{!submitting ? <ArrowRight size={17} /> : null}</Button>
                <button type="button" onClick={handleResend} disabled={resending} className="text-sm font-semibold text-bark hover:underline disabled:cursor-not-allowed disabled:opacity-60">{resending ? 'Sending code...' : 'Resend code'}</button>
            </form>
            <p className="mt-6 text-center text-sm text-muted"><Link className="font-semibold text-bark hover:underline" to="/login">Back to sign in</Link></p>
        </Card>
    </div>;
}
