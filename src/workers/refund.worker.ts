import { Worker,Job } from "bullmq";
import { razorpay } from "../utils/razorpay";
import { Refund } from "../models/refund.model";
import { redis } from "../utils/redis";

export const refundWorker = new Worker("refund_queue",async(job:Job)=>{
    const {refundId,paymentTransactionId,amount} = job.data
    const refundResponse = await razorpay.payments.refund(
        paymentTransactionId,
        {
            amount:amount*100,
            speed:"normal"
        }
    )
    await Refund.findByIdAndUpdate(refundId,{
        status:"PROCESSED",
        refundTransactionId:refundResponse.id,
        processedAt:new Date()
    })
},{
    connection:redis
})