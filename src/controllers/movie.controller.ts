import { Request,Response,NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Movie } from "../models/movies.model";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import slugify from "slugify";

// ADMIN FUNCTIONS

//addMovie
export const addMovie = asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
    const {title,description,duration,language,genre,releaseDate,posterUrl} = req.body;
   //TODO: ADD CLOUDINARY FOR POSTER UPLOAD
   if(!title || !description || !duration || !language || !genre || !releaseDate){
    throw new ApiError(400,"All fields are required");
   }
    let slug = slugify(title,{ lower: true, strict: true });

    // Ensure slug is unique
    const existingSlug = await Movie.findOne({ slug });
    if(existingSlug){
        slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
    }
    const movie = await Movie.create({
        title,
        slug,
        description,
        duration,
        language,
        genre,
        releaseDate:new Date(releaseDate),
        posterUrl
    })
    res.status(201).json(new ApiResponse(201,movie,"Movie added successfully"));
})

// update movie
export const updateMovie = asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
    const {id} = req.params;
    const {title,description,duration,language,genre,releaseDate} = req.body;
    const movie = await Movie.findById(id);
    if(!movie || movie.isDeleted){
        throw new ApiError(404,"Movie not found");
    }
    if(title && title !== movie.title){
        let slug = slugify(title,{ lower: true, strict: true });
    }
    const updatedMovie = await Movie.findByIdAndUpdate(id,{
        $set:{
            title:title || movie.title,
            description:description || movie.description,
            duration:duration || movie.duration,
            language:language || movie.language,
            genre:genre || movie.genre,
            releaseDate:releaseDate || movie.releaseDate
        },
        },{
            new:true,// Return the modified document
            runValidators:true,// Ensure Mongoose schema validation runs
        }).select("-isDeleted");
    res.status(200).json(new ApiResponse(200,updatedMovie,"Movie updated successfully"));
})
// soft delete movie

export const deleteMovie = asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
    const {id} = req.params;
    const movie = await Movie.findByIdAndUpdate(id,
        {isDeleted:true},
        {new :true}
    )
    if(!movie){
        throw new ApiError(404, "Movie not found");
    }
    return res.status(200).json(new ApiResponse(200,{},"Movie soft-Deleted successfully"))
})
// update Poster






// User Facing Functions

//getAllMovies
//getMovieBySlug
//searchMovies
//getComingSoon
//getNowShowing
