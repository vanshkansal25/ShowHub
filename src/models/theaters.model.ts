import mongoose, { Schema } from "mongoose";




export interface ITheater {
    venueId: mongoose.Types.ObjectId; // Reference to Venue
    hallName: string;
    totalCapacity: number;
    seatingLayout: {
        rows: string[]; // e.g., A, B, C
        columns: number; // e.g., 1, 2, 3
        gapSeat: string[]
    }
}

const theaterSchema = new mongoose.Schema<ITheater>({
    venueId: {
        type: Schema.Types.ObjectId,
        ref: 'Venue',
        required: true,
        index: true
    },
    hallName: { type: String, required: true, trim: true },
    totalCapacity: { type: Number, required: true, min: 1 },
    seatingLayout: {
        rows: [String],
        columns: Number,
        gapSeat: [String]
    }

}, { timestamps: true })

export const Theater = mongoose.model<ITheater>("Theater", theaterSchema);