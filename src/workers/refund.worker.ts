import { Worker,Job } from "bullmq";
import { razorpay } from "../utils/razorpay";
import { Refund } from "../models/refund.model";
import { redis } from "../utils/redis";
import { User } from "../models/user.model";

export const refundWorker = new Worker("refund_queue", async (job: Job) => {
    const { refundId, paymentTransactionId, amount } = job.data;

    try {
        const refundResponse = await razorpay.payments.refund(paymentTransactionId, {
            amount: amount * 100,
            speed: "normal"
        });
        const refundRecord = await Refund.findById(refundId);
        if (!refundRecord) throw new Error("Refund record not found");
        const updatedUser = await User.findByIdAndUpdate(
            refundRecord.userId,
            { $inc: { walletBalance: amount } },
            { new: true }
        );
        if (!updatedUser) throw new Error("User not found for wallet credit");
        await Refund.findByIdAndUpdate(refundId, {
            status: "PROCESSED",
            refundTransactionId: refundResponse.id,
            processedAt: new Date()
        });
        console.log(`Refund Success: ₹${amount} to ${updatedUser.userName}`);
    } catch (error) {
        console.error(`Refund Job ${job.id} failed:`, error);
        await Refund.findByIdAndUpdate(refundId, { status: "FAILED" });
        throw error; 
    }
}, { connection: redis });