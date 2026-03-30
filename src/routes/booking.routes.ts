import { Router } from "express";
import { createBooking, confirmBooking, getBookingById, getUserBookings, cancelBookings } from "../controllers/booking.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const bookingRouter = Router();

bookingRouter.post("/book/:showId", authMiddleware, createBooking)
