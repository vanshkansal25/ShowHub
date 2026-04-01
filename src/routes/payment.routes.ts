import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPaymentIntent, getPaymentDetails, getPaymentHistory, verifyPayment } from "../controllers/payment.controller";

const paymentRouter = Router();


paymentRouter.post("/intent",authMiddleware,createPaymentIntent)
paymentRouter.post("/verify",authMiddleware,verifyPayment)
paymentRouter.get("/Detail/:bookingId",authMiddleware,getPaymentDetails)
paymentRouter.get("/History",authMiddleware,getPaymentHistory)



export default paymentRouter