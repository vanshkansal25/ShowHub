
import mongoose, { Schema, HydratedDocument } from "mongoose";

export interface IRefund {
    paymentId: mongoose.Types.ObjectId;
    bookingId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId; // Denormalized for quick lookups
    amount: number;
    reason: string;
    status: "PENDING" | "PROCESSED" | "FAILED" | "REJECTED";
    refundTransactionId?: string; 
    processedAt?: Date;
    metadata?: any;
}

export type RefundDocument = HydratedDocument<IRefund>;

const refundSchema = new Schema<IRefund>({
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { 
        type: String, 
        enum: ["PENDING", "PROCESSED", "FAILED", "REJECTED"], 
        default: "PENDING",
        index: true 
    },
    refundTransactionId: { type: String, sparse: true, unique: true },
    processedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export const Refund = mongoose.model<IRefund>("Refund", refundSchema);