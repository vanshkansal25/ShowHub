import { Router } from "express";
import { getSeatMap,lockSeats,releaseSeats,getAvailableSeats, createSeatsForShow } from "../controllers/seat.controller";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
const seatRouter = Router();

seatRouter.post("/:showId/create",authMiddleware,authorizeRoles("THEATRE_PARTNER","ADMIN"),createSeatsForShow)
seatRouter.get("/:showId/seatmap",getSeatMap)
seatRouter.get("/:showId/availableseats",getAvailableSeats)
seatRouter.post("/:showId",authMiddleware,lockSeats)
seatRouter.post("/:showId",authMiddleware,releaseSeats)

export default seatRouter;