import mongoose, { Schema } from "mongoose";


export interface IPayment{
    bookingId: mongoose.Types.ObjectId; // Reference to the Booking
    transactionId: string; // Unique transaction identifier from payment gateway
    amount: number;
}

const paymentSchema = new Schema<IPayment>({
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    transactionId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true }
},{
    timestamps:true
})

export const Payment = mongoose.model<IPayment>("Payment",paymentSchema); 