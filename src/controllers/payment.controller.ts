import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { razorpay } from "../utils/razorpay";
import { ApiError } from "../utils/apiError";
import { Booking } from "../models/bookings.model";
import { ApiResponse } from "../utils/apiResponse";
import crypto from "crypto";
import { Payment } from "../models/payments.model";
import { Refund } from "../models/refund.model";
import { bookingQueue, refundQueue } from "../queues";

// createPaymentIntent
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
    const {bookingId} = req.body;
    const userId = req.user?.id;
    if(!bookingId){
        throw new ApiError(400,"Booking Id is required")
    }
    if(!userId){
        throw new ApiError(401,"Unauthorized")
    }

    const booking = await Booking.findOne({bookingId});
    if(!booking){
        throw new ApiError(404,"Booking not found")
    }
    // check whether same user is processing the booking
    if(booking.userId.toString() !== userId.toString()){
        throw new ApiError(403,"You are not allowed")
    }
    // prevent double booking
    if( booking.status !== "PENDING"){
        throw new ApiError(400,"Booking already Processed")
    }
    // create razorpay order

    const options = {
        amount:booking.totalAmount*100,
        currency:"INR",
        receipt:booking.bookingId,
        notes:{
            bookingId:booking._id.toString(),
            userId:userId.toString()
        }
    }
    const order = await razorpay.orders.create(options)
    if(!order){
        throw new ApiError(500,"Failed to create Payment Order")
    }
    booking.paymentId = order.id;
    await booking.save();
    return res.status(200).json(new ApiResponse(200,{
        orderId:order.id,
        amount:order.amount,
        currency:order.currency,
        key:process.env.RAZORPAY_KEY_ID // Razorpay Key ID is the public key required by the frontend checkout SDK to initialize the payment modal. Only the Key Secret remains backend-only for secure order creation and signature verification.
    },"Payment Intent created successfully"))

})
// verifyPayment
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => { 
    // to verify payment frontend will send a signature and i have to create the signature in backend(Hmac->(hash based message authentication code) object ) using razorpaySecret if both signature macthes paymennt is successfull update the database

    const {orderId,paymentId,signature} = req.body;
    if(!orderId || !paymentId || !signature){
        throw new ApiError(400,"Invalid Payload")
    }
    // generate the signature 
    const body = `${orderId}|${paymentId}`
    const generatedSignature = crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET!).update(body).digest("hex")

    //match both the signature
    if(generatedSignature !== signature){
        throw new ApiError(400,"Invalid payment signature")
    }
    const booking = await Booking.findOne({
        paymentId:orderId
    })
    if(!booking){
        throw new ApiError(400,"Booking not found")
    }
    const existingPayment = await Payment.findOne({
        transactionId:paymentId
    })
    if (existingPayment) {
        return res.status(200).json(
            new ApiResponse(200, existingPayment, "Payment already verified")
        );
    }
    const payment = await Payment.create({
        bookingId:booking._id,
        transactionId:paymentId,
        amount:booking.totalAmount
    })
    // TODO :add confirmBooking to queue
    await bookingQueue.add("confirmBooking",{
        bookingId:booking.bookingId,
        paymentId:paymentId
    })

    return res.status(200).json(new ApiResponse(200,payment,"Payment Verified Successfully"))


})
// refundPayment
export const initiateRefund = async (booking:any,userId:string) => {
    // only refund in case of cancelled booking
    // take care of double refund
    const payment = await Payment.findOne({
        bookingId:booking._id
    })
    if(!payment){
        throw new ApiError(404,"Payment record not found")
    }

    // check if refund is already proceesed to prevent double refund
    const existingrefund = await Refund.findOne({
        paymentId:payment._id,
        status:{$in:["PENDING","PROCESSED"]}
    })
    if(existingrefund){
        return existingrefund; // Refund already initiated or processed, return existing record
    }
    const refundRecord = await Refund.create({
        paymentId:payment._id,
        bookingId:booking._id,
        userId,
        amount:payment.amount,
        reason:"BOOKING_CANCELLED",
        status:"PENDING"
    })
    try {
        await refundQueue.add("process_refund",{
            refundId:refundRecord._id,
            paymentTransactionId:payment.transactionId,
            amount:payment.amount
        })
    } catch (error) {
        refundRecord.status="FAILED"
        await refundRecord.save();
        throw new ApiError(500,"Unable to initiate the refund. PLease try again")
    }
    return refundRecord;

}
// getPaymentDetails
export const getPaymentDetails = asyncHandler(async (req: Request, res: Response) => { })
// getPaymentHistory
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => { })
