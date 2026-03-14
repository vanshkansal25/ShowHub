import Router from "express"
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
import { createTheater, deleteTheater, getAllTheaters, getMoviesByTheater, getPartnerTheaters, getTheaterDetails, getTheaterLayout, updateTheater } from "../controllers/theater.controller";

const theaterRouter = Router()

theaterRouter.get("/:theaterId/movies", getMoviesByTheater)
theaterRouter.get("/:theaterId/layout", getTheaterLayout)
theaterRouter.get("/:theaterId", getTheaterDetails)
theaterRouter.get("/", getAllTheaters)


theaterRouter.post("/create", authMiddleware, authorizeRoles("THEATRE_PARTNER"), createTheater)
theaterRouter.patch("/update/:theaterId", authMiddleware, authorizeRoles("THEATRE_PARTNER"), updateTheater)
theaterRouter.delete("/delete/:theaterId", authMiddleware, authorizeRoles("THEATRE_PARTNER"), deleteTheater)
theaterRouter.get("/partner", authMiddleware, authorizeRoles("THEATRE_PARTNER"), getPartnerTheaters)

export default theaterRouter
