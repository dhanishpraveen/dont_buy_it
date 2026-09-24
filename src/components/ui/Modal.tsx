import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

type ModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-6" role="presentation" onMouseDown={onClose}>
            <section aria-labelledby="modal-title" aria-modal="true" className="w-full max-w-lg rounded-card border border-line bg-surface p-6 shadow-soft" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between gap-4">
                    <h2 id="modal-title" className="font-display text-2xl font-semibold text-ink">{title}</h2>
                    <IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton>
                </div>
                <div className="mt-5">{children}</div>
            </section>
        </div>
    );
}