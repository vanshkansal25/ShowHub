import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response, NextFunction } from "express"
import { ApiError } from "../utils/apiError";
import slugify from "slugify";
import { Event } from "../models/events.model";
import { ApiResponse } from "../utils/apiResponse";



export const createEvent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { title, category, description, date, time, venueId, city } = req.body;
    const organizerId = req.user?.id;
    if (!title || !category || !description || !date || !time || !venueId || !city) {
        throw new ApiError(400, "All fields are required")
    }
    if (!organizerId) {
        throw new ApiError(400, "Organizer not found")
    }
    const slug = slugify(title, { lower: true, strict: true })
    // now check for duplicate events

    const existingEvent = await Event.findOne({
        slug,
        date,
        venueId,
    })
    if (existingEvent) {
        throw new ApiError(400, "Event already exists for this venue and date")
    }
    const event = await Event.create({
        title,
        slug,
        organizerId,
        category,
        description,
        date,
        time,
        venueId,
        city,
        isSoldOut: false
    })
    return res.status(200).json(new ApiResponse(200, event, "Event created successfully"))

})
export const updateEvent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const organizerId = req.user?.id;
    if (!organizerId) {
        throw new ApiError(400, "UNAUTHORIZED")
    }
    const event = await Event.findById(eventId)
    if (!event) {
        throw new ApiError(400, "Event not found")
    }
    if (event.organizerId.toString() !== organizerId) {
        throw new ApiError(400, "You are not authorized to update this event")
    }
    const {
        title,
        category,
        description,
        date,
        time,
        venueId,
        city,
        isSoldOut
    } = req.body;
    if (title && title !== event.title) {
        const newSlug = slugify(title, { lower: true, strict: true })
        const existingSlug = await Event.findOne({
            slug: newSlug,
            _id: { $ne: eventId } // id not equal to current eventId
        })
        if (existingSlug) {
            throw new ApiError(400, "Event with this Slug already Exist")
        }
        event.slug = newSlug
        event.title = title
    }
    if (category) event.category = category;
    if (description) event.description = description;
    if (date) event.date = date;
    if (time) event.time = time;
    if (venueId) event.venueId = venueId;
    if (city) event.city = city;
    if (typeof isSoldOut === "boolean") event.isSoldOut = isSoldOut;

    await event.save()

    return res.status(200).json(new ApiResponse(200, event, "EVENT UPDATED SUCCESSFULLY"))
})
export const deleteEvent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { eventId } = req.params;
    const organizerId = req.user?.id;
    if (!organizerId) {
        throw new ApiError(400, "UNAUTHORIZED")
    }
    const event = await Event.findById(eventId)
    if (!event) {
        throw new ApiError(400, "Event not found")
    }
    if (event.organizerId.toString() !== organizerId) {
        throw new ApiError(400, "You are not authorized to delete this event")
    }
    await event.deleteOne()
    return res.status(200).json(new ApiResponse(200, event, "EVENT DELETED SUCCESSFULLY"))
})
export const publishEvent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})
export const unPublishEvent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})
export const getEventDetail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})
export const getOrganizerEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})
export const getEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})

export const getEventsByCity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})

export const searchEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})

export const getEventsByCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})

export const getUpcomingEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})

