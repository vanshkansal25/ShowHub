import mongoose, { Schema } from "mongoose";


export interface IBooking {
    bookingId:string;
    userId: mongoose.Types.ObjectId;
    showId: mongoose.Types.ObjectId;
    seatIds: mongoose.Types.ObjectId[]; 
    seatNumbers: string[];              
    totalAmount: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
    paymentId?: string;                 
    idempotencyKey: string;             // To prevent double charging
    qrCode?: string;
    isCheckedIn: boolean;
    checkedInAt?: Date;                    
}

const bookingSchema = new Schema<IBooking>({
    bookingId:{type:String, unique:true,uppercase:true,index:true},
    userId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
    showId: { type: Schema.Types.ObjectId, ref: 'Show', required: true },
    seatIds: [{ type: Schema.Types.ObjectId, ref: 'Seat', required: true }],
    seatNumbers:[{type:String,required:true}],
    totalAmount:{type:Number,required:true},
    status:{
        type:String, enum:["PENDING" , "CONFIRMED" , "CANCELLED" , "EXPIRED"],default:"PENDING",index:true
    },
    paymentId: { type: String, sparse: true, unique: true }, // Sparse allows null until payment
    idempotencyKey: { type: String, required: true, unique: true },
    qrCode: { type: String },
    isCheckedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
},{
    timestamps:true
})

export const Booking = mongoose.model<IBooking>("Booking",bookingSchema);