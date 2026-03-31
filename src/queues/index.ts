import { Queue } from "bullmq";
import { redis } from "../utils/redis";


const bookingQueue = new Queue("booking_queue",{
    connection:redis,
    defaultJobOptions:{
        attempts:5,
        backoff:{
            type:"exponential",
            delay:2000
        },// this means after exponents of 2 -> 2s , 4s, 8s ,16s
        removeOnComplete:true,
        removeOnFail:false
    }
})

export const refundQueue = new Queue("refund_queue",{
    connection:redis,
    defaultJobOptions:{
        attempts:4,
        backoff:{
            type:"exponential",
            delay:4000
        },
        removeOnComplete:true,
        removeOnFail:false
    }
})
