import { Router } from "express";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
import { addMovie, deleteMovie, getAllMovies, getComingSoon, getMovieBySlug, getMoviesByCity, getNowShowing, searchMovies, updateMovie } from "../controllers/movie.controller";


const movieRouter = Router();

movieRouter.post("/addMovie",authMiddleware,authorizeRoles("ADMIN"), addMovie);
movieRouter.patch("/updateMovie/:id",authMiddleware,authorizeRoles("ADMIN"), updateMovie);
movieRouter.delete("/deleteMovie/:id",authMiddleware,authorizeRoles("ADMIN"), deleteMovie);
movieRouter.get("/",getAllMovies);
movieRouter.get("/search", searchMovies);
movieRouter.get("/coming-soon", getComingSoon);
movieRouter.get("/now-showing", getNowShowing);
movieRouter.get("/city/:city", getMoviesByCity);
movieRouter.get("/slug/:slug", getMovieBySlug);


export default movieRouter;