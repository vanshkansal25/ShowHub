import { Router } from "express";
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
import { createVenue, getVenueDetails, getVenuesByCity, getVenueShows } from "../controllers/venue.controller";

const venueRouter = Router();

venueRouter.post("/create",authMiddleware,authorizeRoles("ADMIN","EVENT_ORGANIZER","THEATRE_PARTNER"),createVenue)
venueRouter.get("/city/:city",getVenuesByCity);
venueRouter.get("/details/:venueId",getVenueDetails);
venueRouter.get("/shows/:venueId",getVenueShows)


export default venueRouter;