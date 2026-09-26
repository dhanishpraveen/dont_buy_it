import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const trustHistorySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: { type: String, enum: ['successful-exchange', 'successful-return', 'cancellation', 'late-return', 'review-received', 'verification'], required: true },
    exchange: { type: Schema.Types.ObjectId, ref: 'Exchange' },
    review: { type: Schema.Types.ObjectId, ref: 'Review' },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const TrustHistoryModel = models.TrustHistory || model('TrustHistory', trustHistorySchema);
