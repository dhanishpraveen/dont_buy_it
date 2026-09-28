import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const listingSchema = new Schema({
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accessType: { type: String, enum: ['borrow', 'rent', 'buy-used', 'buy-new'], required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, enum: ['free', 'per-day', 'per-week', 'one-time'], required: true },
    totalCost: { type: Number, required: true, min: 0 },
    availability: { type: String, enum: ['available', 'partially-available', 'unavailable'], default: 'available', index: true },
    availableFrom: { type: String, default: null },
    availableUntil: { type: String, default: null },
    location: { type: String, required: true, trim: true },
    locationPoint: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] },
    },
    distanceKm: { type: Number, required: true, min: 0 },
    condition: { type: String, required: true, trim: true },
    conditionScore: { type: Number, required: true, min: 0, max: 100 },
    trustScore: { type: Number, required: true, min: 0, max: 5 },
    convenienceScore: { type: Number, required: true, min: 0, max: 100 },
    usageSuitabilityScore: { type: Number, required: true, min: 0, max: 100 },
    status: { type: String, enum: ['draft', 'active', 'paused', 'closed'], default: 'active', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

listingSchema.index({ accessType: 1, availability: 1, status: 1 });
listingSchema.index({ locationPoint: '2dsphere' });

export const ListingModel = models.Listing || model('Listing', listingSchema);
