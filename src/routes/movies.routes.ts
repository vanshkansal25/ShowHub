import { Router } from "express";
import { authorizeRoles } from "../middlewares/auth.middleware";
import { addMovie, deleteMovie, getAllMovies, getComingSoon, getMovieBySlug, getMoviesByCity, getNowShowing, searchMovies, updateMovie } from "../controllers/movie.controller";


const movieRouter = Router();

movieRouter.post("/addMovie",authorizeRoles("ADMIN"), addMovie);
movieRouter.patch("/updateMovie/:id",authorizeRoles("ADMIN"), updateMovie);
movieRouter.delete("/deleteMovie/:id",authorizeRoles("ADMIN"), deleteMovie);
movieRouter.get("/",getAllMovies);
movieRouter.get("/search", searchMovies);
movieRouter.get("/coming-soon", getComingSoon);
movieRouter.get("/now-showing", getNowShowing);
movieRouter.get("/city/:city", getMoviesByCity);
movieRouter.get("/slug/:slug", getMovieBySlug);


export default movieRouter;