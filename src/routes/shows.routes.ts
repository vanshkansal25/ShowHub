import { Router } from "express";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
import { createShow, deleteShow, getShowDetails, getShowsByEvent, getShowsByMovie, updateShow } from "../controllers/show.controller";

const showRouter = Router();


showRouter.post('/create',authMiddleware,authorizeRoles("ADMIN","EVENT_ORGANIZER","THEATRE_PARTNER"),createShow);
showRouter.patch('/update/:showId',authMiddleware,authorizeRoles("ADMIN","EVENT_ORGANIZER","THEATRE_PARTNER"),updateShow);
showRouter.delete('/delete/:showId',authMiddleware,authorizeRoles("ADMIN","EVENT_ORGANIZER","THEATRE_PARTNER"),deleteShow);


showRouter.get('/movie/:movieId',getShowsByMovie);
showRouter.get('/event/:eventId',getShowsByEvent);
showRouter.get('/:showId',getShowDetails)


export default showRouter;