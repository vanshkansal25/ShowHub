import mongoose, { HydratedDocument, Schema } from "mongoose";


export interface ISeat {
    showId: mongoose.Types.ObjectId;   // The specific show time
    theaterId: mongoose.Types.ObjectId; // The physical hall
    seatNumber: string;                // e.g., "A12"
    tierName: string;                  // e.g., "GOLD" (copied from Theater for speed)
    price: number;                     // The actual price for this show
    status: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
    lockedBy?: mongoose.Types.ObjectId; // UserID who is currently hovering/selecting
    lockExpiresAt?: Date;              // TTL for the temporary lock
    bookingId?: mongoose.Types.ObjectId; // Final reference once booked
}

export type SeatDocument = HydratedDocument<ISeat>;

const seatSchema = new Schema<ISeat>({
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    theaterId: { type: Schema.Types.ObjectId, ref: 'Theater', required: true }, 
    seatNumber: { type: String, required: true },
    tierName: { type: String, required: true },
    price: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['AVAILABLE', 'LOCKED', 'BOOKED'], 
        default: 'AVAILABLE',
        index: true 
    },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lockExpiresAt: { type: Date },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' }
}, { timestamps: true });

// CRITICAL: Compound index for high-speed availability checks
// We often query: "Give me all seats for Show X that are AVAILABLE"
seatSchema.index({ showId: 1, status: 1 }); // will give answer in ascending order

// CRITICAL: Prevent double-creation of the same seat for the same show
seatSchema.index({ showId: 1, seatNumber: 1 }, { unique: true }); // this ensures that for a given show, a seat number can only exist once


export const Seat = mongoose.model<ISeat>("Seat", seatSchema);

