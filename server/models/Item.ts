import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const itemSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true, index: true },
    images: [{ type: String, trim: true }],
    condition: { type: String, required: true, trim: true },
    capabilities: [{ type: String, trim: true }],
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const ItemModel = models.Item || model('Item', itemSchema);
