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
export const getEventDetail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
        throw new ApiError(400, "You are not authorized to get this event")
    }
    return res.status(200).json(new ApiResponse(200, event, "EVENT DETAIL FETCHED SUCCESSFULLY"))
})
export const getEventBySlug = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    if (!slug) {
        throw new ApiError(400, "Slug is required")
    }
    const event = await Event.findOne({
        slug,
    }).select("-organizerId -slug").lean()
    // .lean() is used to make queries faster and lighter by returning plain JavaScript objects instead of full Mongoose documents.
    if (!event) {
        throw new ApiError(400, "Event not found")
    }
    return res.status(200).json(new ApiResponse(200, event, "EVENT DETAIL FETCHED SUCCESSFULLY"))
})
export const getOrganizerEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const organizerId = req.user?.id;
    if (!organizerId) {
        throw new ApiError(401, "UNAUTHORIZED")
    }
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const [events, totalEvents] = await Promise.all([
        Event.find({ organizerId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
        Event.countDocuments({ organizerId })
    ])
    if (!events) {
        return res.status(200).json(new ApiResponse(200, [], "No Events found"))
    }
    const totalPages = Math.ceil(totalEvents / Number(limit));
    // TODO : ADD REDIS CACHING HERE
    return res.status(200).json(new ApiResponse(200, { events, pagination: { totalPages, currentPage: Number(page), totalEvents, hasNextPage: Number(page) < totalPages } }, "Events fetched successfully"))
})
export const getEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10, category, search, date, city, isSoldOut = false } = req.query;
    const filter: any = {}
    if (category && typeof category === "string") {
        filter.category = category
    }
    if (city && typeof city === "string") {
        filter.city = city
    }
    if (isSoldOut && typeof isSoldOut === "string") {
        if (isSoldOut === "true") filter.isSoldOut = true;
        if (isSoldOut === "false") filter.isSoldOut = false;
    }

    if (date && typeof date === "string") {
        const selectedDate = new Date(date)
        if (isNaN(selectedDate.getTime())) {
            throw new ApiError(400, "INVALID DATE FORMAT")
        }
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)

        filter.date = {
            $gt: startOfDay,
            $lt: endOfDay
        }
    }
    if (search && typeof search === "string") {
        filter.$text = { $search: search }; // Search across text-indexed fields (e.g. title, category, city) it breaks the search query in seperate words like search : "concert karan" it will return all documents containing concert or karan in any of text-indexed field 
    }
    const skip = (Number(page) - 1) * (Number(limit));

    const [events, totalEvents] = await Promise.all([
        Event.find(filter).sort(search ? { score: { $meta: "textscore" } } : "time").skip(skip).limit(Number(limit)).lean(),
        Event.countDocuments(filter)
    ])

    const totalPages = Math.ceil(Number(totalEvents) / Number(limit));
    return res.status(200).json(new ApiResponse(200, {
        events,
        pagination: {
            totalEvents,
            totalPages,
            currentPage: Number(page),
            hasNextPage: Number(page) < totalPages
        }
    }, "Events fetched SucessFully"))
})

export const getEventsByCity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { city } = req.params;
    const { page = 1, limit = 10, category, isSoldOut } = req.query;
    if (!city || typeof city === "string") {
        throw new ApiError(400, "ENTER A VALID CITY")
    }
    const skip = (Number(page) - 1) * Number(limit)

    const filter: any = {
        date: { $gte: new Date() },
        city: city
    }
    if (category && typeof category === "string") {
        filter.category = category
    }
    if (isSoldOut && typeof isSoldOut === "string") {
        if (isSoldOut === "true") filter.isSoldOut = true;
        if (isSoldOut === "false") filter.isSoldOut = false;
    }
    const events = await Event.find(filter).skip(skip).limit(Number(limit)).lean()

    return res.status(200).json(new ApiResponse(200, events, `EVENTS FOR THE ${city} fetched successfully`))
})

export const searchEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query;

})

export const getEventsByCategory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { } = req.query;
})

export const getUpcomingEvents = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})

