// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ListingView } from '../services/listingService';
import { formatFullDate } from '../lib/dateAvailability';
import { RequestAccessPage } from './RequestAccessPage';

const serviceMocks = vi.hoisted(() => ({
    getListing: vi.fn(),
    createRequest: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'requester-1' } }),
}));
vi.mock('../services/listingService', () => ({ getListing: serviceMocks.getListing }));
vi.mock('../services/accessRequestService', () => ({ createRequest: serviceMocks.createRequest }));

function dateAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function makeListing(): ListingView {
    return {
        id: 'listing-1',
        owner: { id: 'owner-1', name: 'Sam Owner', trustScore: 80 },
        item: {
            name: 'Epson Projector',
            description: 'A projector for presentations.',
            category: 'Electronics',
            images: [],
            condition: 'good',
            capabilities: [],
        },
        accessType: 'borrow',
        price: 0,
        priceUnit: 'free',
        availability: 'available',
        availableFrom: `${dateAfterDays(1)}T12:00:00`,
        availableUntil: `${dateAfterDays(3)}T12:00:00`,
        location: 'Central area',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function renderRequestPage() {
    return render(
        <MemoryRouter initialEntries={['/request-access/listing-1']}>
            <Routes>
                <Route path="/request-access/:listingId" element={<RequestAccessPage />} />
                <Route path="/requests/:requestId" element={<p>Request submitted</p>} />
                <Route path="/listing/:listingId" element={<p>Listing details</p>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('Request Access date picker', () => {
    beforeEach(() => {
        serviceMocks.getListing.mockReset().mockResolvedValue(makeListing());
        serviceMocks.createRequest.mockReset().mockResolvedValue({ id: 'request-1' });
    });

    afterEach(cleanup);

    it('shows published dates and keeps the calendar closed until opened', async () => {
        renderRequestPage();

        expect(await screen.findByText('Available dates')).toBeInTheDocument();
        expect(screen.getByText(formatFullDate(dateAfterDays(1)))).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Request access' })).toBeDisabled();
    });

    it('closes each picker after selection and submits the selected range', async () => {
        renderRequestPage();

        const startDate = dateAfterDays(1);
        fireEvent.click(await screen.findByRole('button', { name: 'Select start date' }));
        expect(screen.getByRole('dialog', { name: 'Start date calendar' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: formatFullDate(startDate) }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: formatFullDate(startDate) })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: formatFullDate(startDate) }));
        expect(screen.getByRole('dialog', { name: 'Start date calendar' })).toBeInTheDocument();
        const revisedStartDate = dateAfterDays(2);
        fireEvent.click(screen.getByRole('button', { name: formatFullDate(revisedStartDate) }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Select end date' }));
        expect(screen.getByRole('dialog', { name: 'End date calendar' })).toBeInTheDocument();
        const revisedEndDate = dateAfterDays(3);
        fireEvent.click(screen.getByRole('button', { name: formatFullDate(revisedEndDate) }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: formatFullDate(revisedEndDate) })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Request access' }));

        await waitFor(() => expect(serviceMocks.createRequest).toHaveBeenCalledWith({
            listingId: 'listing-1',
            requestedFrom: new Date(`${revisedStartDate}T00:00:00`).toISOString(),
            requestedUntil: new Date(`${revisedEndDate}T23:59:59`).toISOString(),
            message: null,
        }));
    });

    it('disables dates outside the published availability bounds', async () => {
        renderRequestPage();

        fireEvent.click(await screen.findByRole('button', { name: 'Select start date' }));

        expect(screen.getByRole('button', { name: formatFullDate(dateAfterDays(4)) })).toBeDisabled();
        expect(screen.getByRole('button', { name: formatFullDate(dateAfterDays(1)) })).toBeEnabled();
    });

    it('disables past dates even when the owner availability span includes them', async () => {
        const listing = makeListing();
        listing.availableFrom = `${dateAfterDays(-3)}T12:00:00`;
        serviceMocks.getListing.mockResolvedValueOnce(listing);
        renderRequestPage();

        fireEvent.click(await screen.findByRole('button', { name: 'Select start date' }));

        expect(screen.getByRole('button', { name: formatFullDate(dateAfterDays(-1)) })).toBeDisabled();
        expect(screen.getByRole('button', { name: formatFullDate(dateAfterDays(0)) })).toBeEnabled();
    });

    it('closes the calendar on Escape and outside click', async () => {
        renderRequestPage();

        fireEvent.click(await screen.findByRole('button', { name: 'Select start date' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Select start date' }));
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});