import mongoose, { Schema, HydratedDocument } from "mongoose";

export interface ITierPricing {
    name: string;      // 'Gold', 'Premium', etc.
    price: number;
    capacity: number;
    soldSeats: number; // For quick "Sold Out" checks -> we can tell the user "Only 5 seats left!"
}

export interface IShow {
    movieId?: mongoose.Types.ObjectId; // Optional if it's an Event
    eventId?: mongoose.Types.ObjectId; // Optional if it's a Movie
    venueId: mongoose.Types.ObjectId;
    hallId: mongoose.Types.ObjectId;
    startTime: Date;
    endTime: Date;
    pricing: ITierPricing[];           // Structured pricing and capacity
    status: "Active" | "Ongoing" | "Completed" | "Cancelled" | "Sold Out";
}

export type ShowDocument = HydratedDocument<IShow>;

const showSchema = new Schema<IShow>({
    movieId: { type: Schema.Types.ObjectId, ref: 'Movie', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    hallId: { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    pricing: [{
        name: { type: String, required: true },
        price: { type: Number, required: true },
        capacity: { type: Number, required: true },
        soldSeats: { type: Number, default: 0 }
    }],
    status: { 
        type: String, 
        enum: ["Active", "Ongoing", "Completed", "Cancelled", "Sold Out"], 
        default: "Active",
        index: true 
    }
}, { timestamps: true });

// Compound Index: Optimizes "What shows are in this venue today?"
showSchema.index({ venueId: 1, startTime: 1 });

export const Show = mongoose.model<IShow>("Show", showSchema);