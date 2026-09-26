import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const accessRequestSchema = new Schema({
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    accessType: { type: String, enum: ['borrow', 'rent', 'buy-used', 'buy-new'], required: true },
    requestedFrom: { type: Date },
    requestedUntil: { type: Date },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'], default: 'pending', index: true },
    message: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

export const AccessRequestModel = models.AccessRequest || model('AccessRequest', accessRequestSchema);
