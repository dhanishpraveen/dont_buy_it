import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const reviewSchema = new Schema({
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exchange: { type: Schema.Types.ObjectId, ref: 'Exchange', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });

export const ReviewModel = models.Review || model('Review', reviewSchema);
