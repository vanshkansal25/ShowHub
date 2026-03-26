import { Router } from "express";
import { getSeatMap,lockSeats,releaseSeats,getAvailableSeats } from "../controllers/seat.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
const seatRouter = Router();

seatRouter.get("/:showId/seatmap",getSeatMap)
seatRouter.get("/:showId/availableseats",getAvailableSeats)
seatRouter.post("/:showId",authMiddleware,lockSeats)
seatRouter.post("/:showId",authMiddleware,releaseSeats)

export default seatRouter;