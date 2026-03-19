import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";

import mongoose from "mongoose";
import { ApiError } from "../utils/apiError";
import { getCache,setCache,invalidateCacheByPattern } from "../utils/redis";
import { ApiResponse } from "../utils/apiResponse";
import { Show } from "../models/shows.model";
import { Movie } from "../models/movies.model";
import { Event } from "../models/events.model";
import { Venue } from "../models/venues.model";
import { Theater } from "../models/theaters.model";

// createShow

export const createShow = asyncHandler(async(req:Request,res:Response)=>{
    const {movieId,eventId,venueId,hallId,startTime,endTime,pricing} = req.body;
    if(!movieId && !eventId){
        throw new ApiError(400,"Either movieId or eventId is required")
    }
    if(movieId && eventId){
        throw new ApiError(400,"Either movieId or eventId is required")
    }

    const venue = await Venue.findById(venueId)
    if(!venue){
        throw new ApiError(400,"NO SUCH VENUE EXIST")
    }
    // if hallId provided
    if(hallId){
        const hall = await Theater.findById(hallId)
        if (!hall || hall.venueId.toString() !== venueId) {
            throw new ApiError(400, "Invalid hall for this venue");
        }
    }
    if(movieId){
        const movie = await Movie.findById(movieId);
        if(!movie || movie.isDeleted){
            throw new ApiError(404, "Movie not found");
        }
    }
    if(eventId){
        const event = await Event.findById(eventId);
        if(!event){
            throw new ApiError(404, "Movie not found");
        }
    }
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      throw new ApiError(400, "End time must be after start time");
    }

    // confirm show dont overlap in same hall 
    if( hallId){
        const overlappingShow = await Show.findOne({
            hallId,
            status: { $in: ["Active", "Ongoing"] },
            $or: [
            {
                startTime: { $lt: end },
                endTime: { $gt: start },
            },
            ],
        });

        if (overlappingShow) {
            throw new ApiError(400, "Another show is already scheduled in this time slot");
        }
    }
    if (!Array.isArray(pricing) || pricing.length === 0) {
      throw new ApiError(400, "Pricing tiers are required");
    }

    for (const tier of pricing) {
      if (!tier.name || tier.price <= 0 || tier.capacity <= 0) {
        throw new ApiError(400, "Invalid pricing tier");
      }
    }
    const show = await Show.create({
        movieId,
        eventId,
        venueId,
        hallId,
        startTime: start,
        endTime: end,
        pricing,
    })
    await invalidateCacheByPattern("shows:movie:*");
    await invalidateCacheByPattern("shows:event:*");
    await invalidateCacheByPattern("movies:nowshowing:*");
    await invalidateCacheByPattern("movies:city:*");
    return res.status(200).json(new ApiResponse(20,show,"SHOW CREATED SUCCESSFULLY"))
})
// updateShow
export const UpdateShow = asyncHandler(async(req:Request,res:Response)=>{
    
})
// deleteShow
export const deleteShow = asyncHandler(async(req:Request,res:Response)=>{
    
})

// getShowsByMovie
export const getShowsByMovie = asyncHandler(async (req: Request, res: Response) => {
    const {movieId} = req.params;
    const {city,date} = req.query;
    if(!movieId || !mongoose.Types.ObjectId.isValid(movieId as string)){
        throw new ApiError(400,"Invalid movieId");
    }   
    if(!city || typeof city !== "string"){
        throw new ApiError(400,"City is required and should be a string");
    }
    const selectedDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(selectedDate.setHours(0,0,0,0));
    const endOfDay = new Date(selectedDate.setHours(23,59,59,999));
    const cacheKey = `shows:movie:${movieId}:city:${city.toLowerCase()}:date:${startOfDay.toISOString()}`;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res
        .status(200)
        .json(new ApiResponse(200, cachedData, "Shows fetched (from cache)"));
    }
    // validate movies existence
    const movieExists = await Movie.findOne({
        _id:movieId,
        isDeleted:false,
    })
    if(!movieExists){
        throw new ApiError(404,"Movie not found");
    }
    // Aggregation pipeline to fetch shows of a movie in a city on a specific date
    const shows = await Show.aggregate([
        {
            $match:{
                movieId: new mongoose.Types.ObjectId(movieId as string),
                startTime: { $gte: startOfDay, $lte: endOfDay },
                status: { $in: ["Active", "Ongoing"] }
            }
        },
        {
            $lookup:{
                from:"venues",
                localField:"venueId",
                foreignField:"_id",
                as:"venue"
            }
        },
        {
            $unwind:"$venue"
        },
        {
            $match:{
                "venue.city": city
            }
        },
        {
            $addFields:{
                minPrice: { $min: "$pricing.price" },
                maxPrice: { $max: "$pricing.price" }
            }
        },
        {
            $group:{
                _id:"$movieId",
                venueName: { $first: "$venue.name" },
                city: { $first: "$venue.city" },
                shows:{
                    $push:{
                        ShowId:"$_id",
                        startTime:"$startTime",
                        endTime:"$endTime",
                        minPrice:"$minPrice",
                        maxPrice:"$maxPrice",
                    }
                }
            }
        },
        {
            $project:{
                _id:0, // i dont want the collection id which is created from this aggregation pipeline
                venueId:"$_id", // i want the venue id
                venueName:1,
                city:1,
                shows:1
            }
        },
        {
            $sort : {
                venueName:1
            }
        }
    ])
    const response = {
        movie:{
            id:movieExists.id,
            title:movieExists.title,
            posterUrl:movieExists.posterUrl
        },
        shows
    }
    await setCache(cacheKey,response,300);
    return res.status(200).json(new ApiResponse(200,response,"Shows for required movies fetched successfully"))
})
// getShowsByEvent
export const getShowsByEvent = asyncHandler(async (req: Request, res: Response) => {
    const {eventId} = req.params;
    const { date } = req.query;
    if(!eventId || !mongoose.Types.ObjectId.isValid(eventId as string)){
        throw new ApiError(400,"Invalid event id")
    }
    const selectedDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(selectedDate.setHours(0,0,0,0));
    const endOfDay = new Date(selectedDate.setHours(23,59,59,999));
    const cacheKey = `shows:event:${eventId}:date:${startOfDay.toISOString()}`;
    const cachedData = await getCache(cacheKey);
    if(cachedData){
        return res.status(200).json(new ApiResponse(200,cachedData,"EVENTS FOR VENUE FETCHED SUCCESSFULLY FROM CACHE"))
    }
    const eventExist = await Event.findById(eventId)
    if(!eventExist){
        throw new ApiError(400,"No Such event exist")
    }
    const shows = await Show.aggregate([
        {
            $match:{
                eventId:new mongoose.Types.ObjectId(eventId as string),
                status:{$in:["Active","Ongoing"]},
                startTime:{$gte:startOfDay,$lte:endOfDay}
            }
        },
        {
            $lookup:{
                from:"venues",
                localField:"venueId",
                foreignField:"_id",
                as:"venue"
            }
        },
        {
            $unwind:"$venue"
        },
        {
            $addFields:{
                minPrice: { $min: "$pricing.price" },
                maxPrice: { $max: "$pricing.price" },
            }
        },
        {
            $project:{
                _id: 0,
                showId: "$_id",
                startTime: 1,
                endTime: 1,
                minPrice: 1,
                maxPrice: 1,
                venueId: "$venue._id",
                venueName: "$venue.name",
                city: "$venue.city",
            }
        },
        {
            $sort:{
                venueName:1,
            }
        }
    ])
    const response = {
      event: {
        id: eventExist._id,
        title: eventExist.title,
        city: eventExist.city,
        venueId: eventExist.venueId,
        date: eventExist.date,
        time: eventExist.time,
      },
      shows,
    };
    await setCache(cacheKey,response,300);
    return res.status(200).json(new ApiResponse(200,response,"EVENTS FOR VENUE FETCHED SUCCESSFULLY"))
})

// getShowDetails
export const getShowDetails = asyncHandler(async (req: Request, res: Response) => {

})