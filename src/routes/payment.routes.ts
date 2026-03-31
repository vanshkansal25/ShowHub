import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { createPaymentIntent, verifyPayment } from "../controllers/payment.controller";

const paymentRouter = Router();


paymentRouter.post("/intent",authMiddleware,createPaymentIntent)
paymentRouter.post("/verify",authMiddleware,verifyPayment)


export default paymentRouter