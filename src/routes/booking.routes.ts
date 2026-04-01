import { Router } from "express";
import { createBooking, getBookingById, getUserBookings, cancelBookings, getShowBookings } from "../controllers/booking.controller";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";

const bookingRouter = Router();

bookingRouter.post("/book/:showId", authMiddleware, createBooking)
bookingRouter.get("/:bookingId",authMiddleware,getBookingById)
bookingRouter.get("/bookings",authMiddleware,getUserBookings)
bookingRouter.patch("/:bookingId/cancel",authMiddleware,cancelBookings)
bookingRouter.get("/shows/:showId/bookings",authMiddleware,authorizeRoles("ADMIN","EVENT_ORGANIZER","THEATRE_PARTNER"),getShowBookings)


export default bookingRouter;
