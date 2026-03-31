import { Router } from "express";
import { createBooking, getBookingById, getUserBookings, cancelBookings } from "../controllers/booking.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const bookingRouter = Router();

bookingRouter.post("/book/:showId", authMiddleware, createBooking)
bookingRouter.get("/:bookingId",authMiddleware,getBookingById)
bookingRouter.get("/bookings",authMiddleware,getUserBookings)
bookingRouter.patch("/:bookingId/cancel",authMiddleware,cancelBookings)


export default bookingRouter;
