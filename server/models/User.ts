import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const userSchema = new Schema({
    supabaseUserId: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    profileImage: { type: String, trim: true },
    location: { type: String, trim: true },
    approximateLocation: { type: String, trim: true },
    verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified' },
    trustSummary: {
        score: { type: Number, min: 0, max: 5, default: 0 },
        completedExchanges: { type: Number, min: 0, default: 0 },
        reviewCount: { type: Number, min: 0, default: 0 },
    },
}, { timestamps: true });

export const UserModel = models.User || model('User', userSchema);
