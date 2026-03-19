import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { Movie } from "../models/movies.model";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import slugify from "slugify";
import { Show } from "../models/shows.model";
import { getCache, invalidateCacheByPattern, setCache } from "../utils/redis";

// ADMIN FUNCTIONS

//addMovie
export const addMovie = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const {
            title,
            description,
            duration,
            language,
            genre,
            releaseDate,
            posterUrl,
        } = req.body;
        //TODO: ADD CLOUDINARY FOR POSTER UPLOAD
        if (
            !title ||
            !description ||
            !duration ||
            !language ||
            !genre ||
            !releaseDate
        ) {
            throw new ApiError(400, "All fields are required");
        }
        let slug = slugify(title, { lower: true, strict: true });

        // Ensure slug is unique
        const existingSlug = await Movie.findOne({ slug });
        if (existingSlug) {
            slug = `${slug}-${Math.floor(Math.random() * 10000)}`;
        }
        const movie = await Movie.create({
            title,
            slug,
            description,
            duration,
            language,
            genre,
            releaseDate: new Date(releaseDate),
            posterUrl,
        });
        await invalidateCacheByPattern("movies:list:*");
        await invalidateCacheByPattern("movies:search:*");
        await invalidateCacheByPattern("movies:comingsoon");
        res
            .status(201)
            .json(new ApiResponse(201, movie, "Movie added successfully"));
    }
);

// update movie
export const updateMovie = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const { title, description, duration, language, genre, releaseDate } =
            req.body;
        const movie = await Movie.findById(id);
        if (!movie || movie.isDeleted) {
            throw new ApiError(404, "Movie not found");
        }
        if (title && title !== movie.title) {
            let slug = slugify(title, { lower: true, strict: true });
        }
        const updatedMovie = await Movie.findByIdAndUpdate(
            id,
            {
                $set: {
                    title: title || movie.title,
                    description: description || movie.description,
                    duration: duration || movie.duration,
                    language: language || movie.language,
                    genre: genre || movie.genre,
                    releaseDate: releaseDate || movie.releaseDate,
                },
            },
            {
                new: true, // Return the modified document
                runValidators: true, // Ensure Mongoose schema validation runs
            },
        ).select("-isDeleted");
        await invalidateCacheByPattern("movies:list:*");
        await invalidateCacheByPattern("movies:search:*");
        await invalidateCacheByPattern("movies:comingsoon");
        res
            .status(200)
            .json(new ApiResponse(200, updatedMovie, "Movie updated successfully"));
    }
);
// soft delete movie

export const deleteMovie = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { id } = req.params;
        const movie = await Movie.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true },
        );
        if (!movie) {
            throw new ApiError(404, "Movie not found");
        }
        await invalidateCacheByPattern("movies:list:*");
        await invalidateCacheByPattern("movies:search:*");
        await invalidateCacheByPattern("movies:comingsoon");
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Movie soft-Deleted successfully"));
    }
);
// update Poster

// User Facing Functions

//getAllMovies
export const getAllMovies = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const {
            page = 1,
            limit = 10,
            genre,
            language,
            search,
            upcoming = "false",
        } = req.query;

        const cacheKey = `movies:list:page=${page}:limit=${limit}:genre=${genre || "all"}:language=${language || "all"}:search=${search || "none"}:upcoming=${upcoming}`;
        const cachedData = await getCache(cacheKey);
        if(cachedData){
            return res.status(200).json(new ApiResponse(200, cachedData, "Movies fetched successfully (from cache)"));
        }
        // building the filter object
        const filter: any = { isDeleted: false };
        if (genre) {
            filter.genre = { $in: [genre] };
        }
        if (language) {
            filter.language = { $in: [language] };
        }
        if (search) {
            filter.$text = { $search: search }; // MongoDB will return documents where searchedValue appears in indexed text fields.
        }
        if (upcoming === "true") {
            filter.releaseDate = { $gt: new Date() };
        }

        // pagination based query
        const skip = (Number(page) - 1) * Number(limit);

        // because of pagination i require two thing movies,totalMovies so instead of running two db queries I will use promises to run this task simultaneously
        const [movies, totalMovies] = await Promise.all([
            Movie.find(filter)
                .sort(search ? { score: { $meta: "textScore" } } : "-releaseDate")
                .skip(skip)
                .limit(Number(limit))
                .select("title slug posterUrl genre language releaseDate"),
            Movie.countDocuments(filter),
        ]);

        // total pages

        const totalPages = Math.ceil(totalMovies / Number(limit));
        await setCache(cacheKey,movies,3600)
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    movies,
                    // pagination metadata for frontend
                    pagination: {
                        totalMovies,
                        totalPages,
                        currentPage: Number(page),
                        hasNextPage: Number(page) < totalPages,
                    },
                },
                "Movies fetched successfully",
            ),
        );
        
    }
);
//getMoviesByCity
export const getMoviesByCity = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { city } = req.params;
        if (!city || typeof city !== "string") {
            throw new ApiError(400, "City name is required to fetch movies");
        }
        const cacheKey = `movies:city:${city.toLowerCase()}`;
        const cachedData = await getCache(cacheKey);
        if(cachedData){
            return res.status(200).json(new ApiResponse(200, cachedData, `Movies currently showing in ${city} (from cache)`));
        }
        const moviesInCity = await Show.aggregate([
            // 1. Join with Venue to filter by City
            {
                $lookup: {
                    from: "venues",
                    localField: "venueId",
                    foreignField: "_id",
                    as: "venueDetails",
                },
            },
            // 2. Unwind the venueDetails array (converts it to an object)
            { $unwind: "$venueDetails" },
            // 3. Filter by City and Active Status
            {
                $match: {
                    "venueDetails.city": { $regex: new RegExp(city, "i") }, // Case-insensitive match
                    status: "Active",
                    startTime: { $gte: new Date() }, // Only shows that haven't started yet
                },
            },
            // 4. Join with Movie collection to get metadata
            {
                $lookup: {
                    from: "movies",
                    localField: "movieId",
                    foreignField: "_id",
                    as: "moviesDetail",
                },
            },
            {
                $unwind: "$moviesDetail",
            },
            // 5. Group by Movie ID so we don't get duplicates
            {
                $group: {
                    _id: "$movieId", //grouping based on movie id movies with same id grouped together
                    title: { $first: "$movieDetail.title" }, // $first returns the first value encountered in the group. Because all shows of the same movie have the same title.
                    slug: { $first: "$movieDetail.slug" },
                    posterUrl: { $first: "$movieDetail.posterUrl" },
                    genre: { $first: "$movieDetail.genre" },
                    language: { $first: "$movieDetail.language" },
                    rating: { $first: "$movieDetail.rating" },
                    // Also counting how many theaters are playing this
                    totalTheaters: { $addToSet: "$venueId" },
                },
            },
            // 6. Clean up the output
            {
                $project: {
                    _id: 1,
                    title: 1,
                    slug: 1,
                    posterUrl: 1,
                    genre: 1,
                    language: 1,
                    rating: 1,
                    theaterCount: { $size: "$totalTheaters" },
                },
            },
            // 7. Sort by Rating or Title
            { $sort: { rating: -1 } },
        ]);
        await setCache(cacheKey,moviesInCity,1800)
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    moviesInCity,
                    `Movies currently showing in ${city}`,
                ),
            );
    }
);
//getMovieBySlug
export const getMovieBySlug = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { slug } = req.params;
        const movie = await Movie.findOne({
            slug,
            isDeleted: false,
        });
        if (!movie) {
            throw new ApiError(404, "Movie not found or has been removed");
        }
        const cacheKey = `movie:slug:${slug}`;
        const cachedData = await getCache(cacheKey);
        if(cachedData){
            return res.status(200).json(new ApiResponse(200, cachedData, "Movie details fetched successfully (from cache)"));
        }
        // 2. Check for Active Shows (Optimization)
        // I don't need the full show data here, just a boolean "Is it playing?"
        const hasActiveShows = await Show.exists({
            movieId: movie._id,
            status: "Active",
            startTime: { $gt: new Date() },
        });
        // exists() returns either an object or null.

        // 3. Response Structure
        // Combine the movie data with the 'isBookable' status
        const movieData = {
            ...movie.toObject(),
            isBookable: !!hasActiveShows, // Converts null/object to true/false
        };
        await setCache(cacheKey,movieData,3600*6);
        return res
            .status(200)
            .json(
                new ApiResponse(200, movieData, "Movie details fetched successfully"),
            );
    }
);

//searchMovies
export const searchMovies = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const { q } = req.query;
        if (!q || typeof q !== "string") {
            throw new ApiError(400, "Search query is required");
        }
        const cacheKey = `movies:search:${q.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`;
        const cachedData = await getCache(cacheKey);
        if(cachedData){
            return res.status(200).json(new ApiResponse(200, cachedData, `Search results for "${q}" (from cache)`));
        }
        // 1. Perform Text Search
        const movies = await Movie.find({
            $text: { $search: q },
            isDeleted: false,
        },
        { score: { $meta: "textScore" } } // Get relevance score
        ).sort({ score: { $meta: "textScore" } }) // Sort by relevance
        .limit(10) // Limit results for performance
        .select("title slug posterUrl genre language rating"); // Select only necessary fields

        // 2. Handle No Results
        if(movies.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No movies found matching your search"));
        }
        await setCache(cacheKey,movies,3600)
        return res.status(200).json(
            new ApiResponse(200, movies, `Found ${movies.length} movies`)
        );
    }
);

//getComingSoon
export const getComingSoon = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        // 1. Define the "Now" timestamp
        const now = new Date();
        const cacheKey = `movies:comingsoon`;
        const cachedData = await getCache(cacheKey);
        if(cachedData){
            return res.status(200).json(new ApiResponse(200, cachedData, "Coming soon movies fetched successfully (from cache)"));
        }
        // 2. Fetch movies with a future release date
        // We sort by 'releaseDate' ascending (1) so the nearest ones come first
        const movies = await Movie.find({
            releaseDate: { $gt: now },
            isDeleted: false
        })
        .sort({ releaseDate: 1 }) 
        .select("title slug posterUrl genre language releaseDate rating")
        .limit(20); // Limit to top 20 upcoming titles

        // 3. Handle Empty State
        if (!movies || movies.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, [], "No upcoming movies at the moment")
            );
        }
        await setCache(cacheKey,movies,3600);
        return res.status(200).json(
            new ApiResponse(200, movies, "Upcoming movies fetched successfully")
        );
    }
);

//getNowShowing

// edge case here - A movie might have been released two weeks ago, but if no theater in the user's city has a scheduled Show for it today, it should not appear in the "Now Showing" section. Therefore, this controller must look at the Show collection, not just the Movie collection.
export const getNowShowing = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => { 
        const { city } = req.query;
        const cacheKey = `movies:nowshowing:city=${city || "all"}`;
        const cachedData = await getCache(cacheKey);
        if(cachedData){
            return res.status(200).json(new ApiResponse(200, cachedData, `Now showing movies fetched successfully (from cache)`));
        }
        const pipeline:any[] = [
            {
                $match:{
                    status: "Active",
                    startTime: { $gt: new Date() }
                }
            }
        ]

        // 2. If city is provided, we must join Venue to filter by city
        if(city && typeof city === "string"){
            pipeline.push(
                {
                    $lookup:{
                        from:"venues",
                        localField:"venueId",
                        foreignField:"_id",
                        as:"venueDetails"
                    }
                },{
                    $unwind:"$venueDetails"
                },{
                    $match: { "venueDetails.city": { $regex: new RegExp(city as string, "i") } }
                }
            )
        }
        // 3. Group by Movie ID to get a unique list of movies currently in theaters
        pipeline.push({
            $group:{
                _id:"$movieId"
            }
        },
        // 4. Join with Movie collection to get details
        {
            $lookup:{
                from:"movies",
                localField:"_id",
                foreignField:"_id",
                as:"movieDetails"
            }
        },{
            $unwind:"$movieDetails"
        },{
            $project: {
                _id: 1,
                title: "$movieDetails.title",
                slug: "$movieDetails.slug",
                posterUrl: "$movieDetails.posterUrl",
                genre: "$movieDetails.genre",
                rating: "$movieDetails.rating",
                language: "$movieDetails.language"
            }
        })
        const movies = await Show.aggregate(pipeline);
        if(movies.length === 0){
            return res.status(200).json(
                new ApiResponse(200, [], "No movies are currently showing in theaters")
            );
        }

        await setCache(cacheKey, movies, 1800); // Cache for 30 minutes
        return res.status(200).json(
            new ApiResponse(200, movies, "Now showing movies fetched successfully")
        );
    }
);
