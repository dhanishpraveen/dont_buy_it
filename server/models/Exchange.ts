import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const exchangeSchema = new Schema({
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    borrowerBuyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    item: { type: Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    accessRequest: { type: Schema.Types.ObjectId, ref: 'AccessRequest', required: true },
    status: { type: String, enum: ['scheduled', 'handed-over', 'in-use', 'returned', 'completed', 'cancelled'], default: 'scheduled', index: true },
    scheduledFrom: { type: Date },
    scheduledUntil: { type: Date },
}, { timestamps: true });

export const ExchangeModel = models.Exchange || model('Exchange', exchangeSchema);
