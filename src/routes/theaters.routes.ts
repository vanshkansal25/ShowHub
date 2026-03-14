import Router from "express"
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
import { createTheater, getMoviesByTheater, getTheaterLayout } from "../controllers/theater.controller";

const theaterRouter = Router()





export default theaterRouter
