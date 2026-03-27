
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import crypto from "crypto";
import { Booking } from "../models/bookings.model";
import { ApiResponse } from "../utils/apiResponse";
import { redis } from "../utils/redis";
import { Seat } from "../models/seats.model";

export const createBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { showId } = req.params;
    const { seatNumbers } = req.body;
    const userId = req.user?.id;
    if(!showId || !seatNumbers || !Array.isArray(seatNumbers)){
        throw new ApiError(400, "Invalid Input")
    }
    if(!userId){
        throw new ApiError(401,"Unauthorized")
    }
    // create a idempotency key 
    const rawKey = req.headers["idempotency-key"];

    const idempotencyKey = Array.isArray(rawKey)? rawKey[0]: typeof rawKey === "string"? rawKey: crypto.randomUUID();
    const existingBooking = await Booking.findOne({idempotencyKey}); // checking booking based on idempotency key to prevent double paymemts
    if(existingBooking){
        return res.status(200).json(new ApiResponse(200,existingBooking,"BOOKING ALREADY EXIST"))
    }
    // validate redis lock 
    const lockKeys = seatNumbers.map(
        (seat)=>`seat:lock:${showId}:${seat}`
    )
    const locks = await Promise.all(
        lockKeys.map((key)=>redis.get(key))
    )
    // check if this seats are locked by the same user
    for(let i = 0 ; i < locks.length ;i++){
        if(locks[i]!== userId.toString()){
            throw new ApiError(400,`Seat ${seatNumbers[i]} is not locked by you`)
        }
    }
    // fetch seats from db
    const seats = await Seat.find({
        showId,
        seatNumber:{$in:seatNumbers}
    })
    if(seats.length !== seatNumbers.length){
        throw new ApiError(404,"Some Seats not found")
    }
    // check if already booked
    const alreadyBooked = seats.find((seat)=>seat.status ==="BOOKED")
    if(alreadyBooked){
        throw new ApiError(
            409,
            `Seat ${alreadyBooked.seatNumber} already booked`
        );
    }
    // calculate the amount
    const totalAmount = seats.reduce((sum,seat)=>sum+seat.price,0)
    const booking = await Booking.create({
        bookingId:`BKG-${Date.now()}`,
        userId,
        showId,
        seatIds:seats.map((s)=>s._id),
        seatNumbers,
        totalAmount,
        status:"PENDING",
        idempotencyKey
    })
    return res.status(201).json(
        new ApiResponse(201, booking, "Booking created. Proceed to payment")
    );
})

export const confirmBooking = asyncHandler(async(req: Request, res: Response) => { 
})
// getBookingById
export const getBookingById = asyncHandler(async (req: Request, res: Response) => {
    const {bookingId} = req.params;
    const userId = req.user?.id;

    if(!bookingId){
        throw new ApiError(400,"Booking ID is required")
    }
    if(!userId) throw new ApiError(401,"Unauthorized");
    const booking = await Booking.findOne({bookingId})

    if(!booking){
        throw new ApiError(404,"Booking Not Found")
    }
    if(booking.userId.toString() !== userId.toString()){
        throw new ApiError(403, "You are not allowed to access this booking");
    }
    const response = {
        bookingId: booking.bookingId,
        status: booking.status,
        totalAmount: booking.totalAmount,
        seatNumbers: booking.seatNumbers,
        qrCode: booking.qrCode,
        isCheckedIn: booking.isCheckedIn,
        show: booking.showId
    }
    return res.status(200).json(new ApiResponse(200,response,"Booking Fetched successfully"))
})
// getUserBookings
export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {

})
// cancelBooking
export const cancelBookings = asyncHandler(async (req: Request, res: Response) => {

})
// validateQR
export const validateQR = asyncHandler(async (req: Request, res: Response) => {

})
// downloadTicket
export const downloadTicket = asyncHandler(async (req: Request, res: Response) => {

})
// getShowBookings
export const getShowBookings = asyncHandler(async (req: Request, res: Response) => {

})
// getEventBookings
export const getEventBookings = asyncHandler(async (req: Request, res: Response) => {

})

