import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const notificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, default: false, index: true },
    relatedEntity: {
        entityType: { type: String, trim: true },
        entityId: { type: Schema.Types.ObjectId },
    },
}, { timestamps: true });

export const NotificationModel = models.Notification || model('Notification', notificationSchema);
