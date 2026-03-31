import mongoose from "mongoose";
import { Booking } from "../models/bookings.model";
import { Seat } from "../models/seats.model";
import { redis } from "../utils/redis";
import { Worker,Job } from "bullmq";



export const bookingWorker = new Worker("booking_queue",async(job:Job) => { 
    const {bookingId,paymentId} = job.data;
    const session = await mongoose.startSession();
    session.startTransaction();
    try{
        // fetch booking
        const booking = await Booking.findOne({bookingId}).session(session);
        if(!booking){
            throw new Error("Booking Not Found")
        }
        // check for if booking is already confirmed

        if(booking.status === "CONFIRMED"){
            return; // already processed
        }
        if(booking.status !== "PENDING"){
            throw new Error("Invalid booking state");
        }
        // update db

        const updateDB = await Seat.updateMany({
            _id:{$in:booking.seatIds},
            status:"AVAILABLE"
        },{
            $set:{
                status:"BOOKED",
                bookingId:booking._id
            }
        },{session})

        if(updateDB.modifiedCount !== booking.seatIds.length){
            throw new Error("Seat conflict detected")
        }

        booking.status = "CONFIRMED";
        booking.paymentId = paymentId;

        booking.qrCode = `QR-${booking.bookingId}-${Date.now()}`

        await booking.save({session})

        // clear redis locks

        const lockKeys = booking.seatNumbers.map((seat)=>`seat:lock:${booking.showId}:${seat}`)

        if(lockKeys.length > 0){
            await redis.del(lockKeys)
        }

        await session.commitTransaction();
        session.endSession();
        console.log(`BOOKING CONFIRMED:${booking.bookingId}`)
    }catch(error:any){
        await session.abortTransaction();
        session.endSession();
        console.error("Booking confirmation failed",error.message)
        throw error;// for bullmq to retry
    }
},{
    connection:redis
})

bookingWorker.on("failed",(job,err)=>{
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
})