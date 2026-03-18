import { Router } from "express";

import {
    createEvent,
    updateEvent,
    deleteEvent,
    getEventDetail,
    getEventBySlug,
    getOrganizerEvents,
    getEvents,
    getEventsByCity,
    getUpcomingEvents
} from "../controllers/event.controller"
import { authMiddleware, authorizeRoles } from "../middlewares/auth.middleware";
const eventRouter = Router()

eventRouter.get("/", getEvents)
eventRouter.get("/:slug", getEventBySlug)
eventRouter.get("/:city", getEventsByCity)
eventRouter.get("/upcoming", getUpcomingEvents)
eventRouter.get("/:eventId", authMiddleware, authorizeRoles("EVENT_ORGANIZER"), getEventDetail)
eventRouter.get("/organizer", authMiddleware, authorizeRoles("EVENT_ORGANIZER"), getOrganizerEvents)

eventRouter.post("/create", authMiddleware, authorizeRoles("EVENT_ORGANIZER"), createEvent)
eventRouter.patch("/update/:eventId", authMiddleware, authorizeRoles("EVENT_ORGANIZER"), updateEvent)
eventRouter.delete("/delete/:eventId", authMiddleware, authorizeRoles("EVENT_ORGANIZER"), deleteEvent)


export default eventRouter

