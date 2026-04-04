import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { Venue } from "../models/venues.model";
import { ApiResponse } from "../utils/apiResponse";
import mongoose from "mongoose";
import { Show } from "../models/shows.model";

//createVenue

export const createVenue = asyncHandler(async (req: Request, res: Response) => {
    const {name,city,address,contactDetails} = req.body;
    const user = req.user;
    if( !user || !["ADMIN","THEATER_PARTNER","EVENT_ORGANIZER"].includes(user.role)){
        throw new ApiError(400,"You are not authorized to create a venue")
    }
    if(!name || !city || !address || !contactDetails?.phone || !contactDetails?.email){
        throw new ApiError(400,"Fields are required to create new venue")
    }
    const normalizedName = name.trim().toLowerCase();
    const normalizeCity = city.trim().toLowerCase();

    const existingVenue = await Venue.findOne({
        name:new RegExp(`^${normalizedName}$`, "i"), //--> ^-startof string,$-endofstring , i->case insensitive
        city:normalizeCity
    })
    if(existingVenue){
        throw new ApiError(400,"Venue already Exist")
    }
    const venue = await Venue.create({
        name:normalizedName,
        city:normalizeCity,
        ownerId:user.id,
        address:address.trim(),
        contactDetails:{
            phone: contactDetails.phone.trim(),
            email: contactDetails.email.trim().toLowerCase()
        }
    })
    return res.status(200).json(new ApiResponse(200,venue,"VENUE CREATED SUCCESSFULLY"))
})

// getVenuesByCity
export const getVenuesByCity = asyncHandler(async (req: Request, res: Response) => {
    const { city } = req.params;

    if (!city || typeof city !== "string") {
        throw new ApiError(400, "City is required");
    }
    const normalizedCity = city.trim().toLowerCase();

    const venue = await Venue.find({
        city:normalizedCity
    }).lean();
    return res.status(200).json(new ApiResponse(200,venue,`Venue in ${city}`))
})
// getVenueDetails
export const getVenueDetails = asyncHandler(async (req: Request, res: Response) => {
    const {venueId} = req.params;
    if(!venueId || !mongoose.Types.ObjectId.isValid(venueId as string)){
        throw new ApiError(400,"Invalid VenueId")
    }
    const venueExist = await Venue.findById(venueId).lean();
    if(!venueExist){
        throw new ApiError(400,"Venue does not exist")
    }
    return res.status(200).json(new ApiResponse(200,venueExist,`Venue Details fetched successfully`))
})
// getVenueShows
export const getVenueShows = asyncHandler(async (req: Request, res: Response) => {
    const { venueId } = req.params;
    const { date, movieId, eventId } = req.query;

    if (!venueId) {
        throw new ApiError(400, "Venue ID is required");
    }
    const matchStage: any = {
        venueId: new mongoose.Types.ObjectId(venueId as string),
        status: "Active",
        startTime: { $gte: new Date() }
    };

    // Date filter
    if (date) {
        const startOfDay = new Date(date as string);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date as string);
        endOfDay.setHours(23, 59, 59, 999);

        matchStage.startTime = {
            $gte: startOfDay,
            $lte: endOfDay
        };
    }

    if (movieId) {
        matchStage.movieId = new mongoose.Types.ObjectId(movieId as string);
    }

    if (eventId) {
        matchStage.eventId = new mongoose.Types.ObjectId(eventId as string);
    }

    const shows = await Show.aggregate([
        { $match: matchStage },

        // Join Movie
        {
            $lookup: {
                from: "movies",
                localField: "movieId",
                foreignField: "_id",
                as: "movieDetails"
            }
        },
        {
            $unwind: {
                path: "$movieDetails",
                preserveNullAndEmptyArrays: true // because i m performing join so there are chances there exist some null value so i m keeping them 
            }
        },

        // Join Event
        {
            $lookup: {
                from: "events",
                localField: "eventId",
                foreignField: "_id",
                as: "eventDetails"
            }
        },
        {
            $unwind: {
                path: "$eventDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 1,
                startTime: 1,
                endTime: 1,
                status: 1,
                content: {
                    _id: {
                        $ifNull: ["$movieDetails._id", "$eventDetails._id"] // { $ifNull: [ <expression>, <replacement-if-null> ] }
                    },
                    title: {
                        $ifNull: ["$movieDetails.title", "$eventDetails.title"]
                    },
                    posterUrl: "$movieDetails.posterUrl",
                    rating: "$movieDetails.rating"
                }
            }
        },

        // Sort by time
        {
            $sort: { startTime: 1 }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, shows, "Venue shows fetched successfully")
    );
})
