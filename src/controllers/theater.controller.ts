import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Theater } from "../models/theaters.model";
import { Venue } from "../models/venues.model";
import { Show } from "../models/shows.model";
import mongoose from "mongoose";


// createTheater
export const createTheater = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { venueId } = req.params;
    const { hallName, totalCapacity, seatingLayout } = req.body;
    const partnerId = req.user?.id;
    if (!partnerId) {
        throw new ApiError(400, "UNAUTHORIZED TO CREATE A NEW THEATER")
    }
    if (!venueId) {
        throw new ApiError(400, "NO SUCH VENUE FOUND TO CREATE THEATER")
    }
    const venue = await Venue.findById(venueId)
    if (!venue) {
        throw new ApiError(400, "NO SUCH VENUE FOUND TO CREATE THEATER")
    }
    if (venue.ownerId?.toString() !== partnerId.toString()) {
        throw new ApiError(403, "YOU ARE NOT AUTHORIZED TO CREATE A NEW THEATER IN THIS VENUE")
    }
    if (!hallName || typeof hallName !== "string" || !hallName.trim()) {
        throw new ApiError(400, "Hall name is required");
    }

    if (!totalCapacity || typeof totalCapacity !== "number" || totalCapacity < 1) {
        throw new ApiError(400, "Valid totalCapacity is required");
    }

    if (!seatingLayout || typeof seatingLayout !== "object") {
        throw new ApiError(400, "Seating layout is required");
    }

    const { rows, columns, gapSeat = [] } = seatingLayout;

    if (!Array.isArray(rows) || rows.length === 0) {
        throw new ApiError(400, "Seating layout rows must be a non-empty array");
    }

    if (!columns || typeof columns !== "number" || columns < 1) {
        throw new ApiError(400, "Seating layout columns must be a positive number");
    }

    if (!Array.isArray(gapSeat)) {
        throw new ApiError(400, "gapSeat must be an array");
    }

    const existingTheater = await Theater.findOne({
        venueId,
        hallName: hallName.trim()
    });

    if (existingTheater) {
        throw new ApiError(409, "A theater with this hall name already exists in this venue");
    }

    // BUILDING A VALID SEAT MAP VALIDATION
    const validSeats = new Set<String>();
    for (const row of rows) {
        if (typeof row !== "string" || !row.trim()) {
            throw new ApiError(400, "EACH ROW MUST BE A VALID NON-EMPTY STRING")
        }
        for (let col = 1; col <= columns; col++) {
            validSeats.add(`${row.trim().toUpperCase()}-${col}`)
        }
    }
    // Validate Gap seat
    const normalizedGapSeats = gapSeat.map((seat: string) => {
        if (typeof seat !== "string" || !seat.trim()) {
            throw new ApiError(400, "Each gapSeat value must be a valid string");
        }
        return seat.trim().toUpperCase();
    });

    for (const seat of normalizedGapSeats) {
        if (!validSeats.has(seat)) {
            throw new ApiError(400, `Invalid gapSeat: ${seat}`);
        }
    }

    // Ensure no duplicate gap seats
    const uniqueGapSeats = new Set(normalizedGapSeats);
    if (uniqueGapSeats.size !== normalizedGapSeats.length) {
        throw new ApiError(400, "Duplicate seats found in gapSeat");
    }

    // Validate totalCapacity against calculated capacity
    const calculatedCapacity = (rows.length * columns) - normalizedGapSeats.length;

    if (totalCapacity !== calculatedCapacity) {
        throw new ApiError(
            400,
            `totalCapacity mismatch. Expected ${calculatedCapacity}, received ${totalCapacity}`
        );
    }
    const theater = await Theater.create({
        venueId,
        hallName: hallName.trim(),
        totalCapacity,
        seatingLayout: {
            rows: rows.map((row: string) => row.trim().toUpperCase()),
            columns,
            gapSeat: normalizedGapSeats
        }
    });
    return res.status(201).json(new ApiResponse(201, theater, "THEATER CREATED SUCCESSFULLY"))
})

// updateTheater
// I cant update this theater if this has current active show 
export const updateTheater = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { theaterId } = req.params;
    const partnerId = req.user?.id;

    const {
        hallName,
        totalCapacity,
        seatingLayout
    } = req.body;

    // 1. Auth check
    if (!partnerId) {
        throw new ApiError(401, "Unauthorized");
    }

    // 2. Validate theaterId
    if (!theaterId) {
        throw new ApiError(400, "Valid theaterId is required");
    }

    // 3. Find theater
    const theater = await Theater.findById(theaterId);

    if (!theater) {
        throw new ApiError(404, "Theater not found");
    }
    // 4. Find venue for ownership validation
    const venue = await Venue.findById(theater.venueId);

    if (!venue) {
        throw new ApiError(404, "Parent venue not found");
    }
    if (venue.ownerId?.toString() !== partnerId.toString()) {
        throw new ApiError(403, "YOU ARE NOT AUTHORIZED TO UPDATE THEATER IN THIS VENUE")
    }

    // 5. Determine if layout-related fields are being updated
    const isLayoutUpdate =
        seatingLayout !== undefined ||
        totalCapacity !== undefined;

    // 6. If layout update, block when upcoming shows exist
    if (isLayoutUpdate) {
        const now = new Date();

        const upcomingShowExists = await Show.exists({
            theaterId: theater._id,
            startTime: { $gte: now }, // adjust field name based on your Show schema
            status: { $in: ["Active", "Ongoing"] } // optional, adjust if you use status
        });

        if (upcomingShowExists) {
            throw new ApiError(
                400,
                "Cannot update seating layout or capacity because this theater has upcoming shows"
            );
        }
    }

    // 7. If hallName is being updated, validate it
    if (hallName !== undefined) {
        if (typeof hallName !== "string" || !hallName.trim()) {
            throw new ApiError(400, "Hall name must be a valid non-empty string");
        }
        const duplicateHall = await Theater.findOne({
            _id: { $ne: theater._id },
            venueId: theater.venueId,
            hallName: hallName.trim()
        });
        if (duplicateHall) {
            throw new ApiError(409, "A theater with this hall name already exists in this venue");
        }
        theater.hallName = hallName.trim();
    }
    // 8. If seatingLayout or totalCapacity is being updated, validate together
    if (isLayoutUpdate) {
        const finalRows = seatingLayout?.rows ?? theater.seatingLayout.rows;
        const finalColumns = seatingLayout?.columns ?? theater.seatingLayout.columns;
        const finalGapSeat = seatingLayout?.gapSeat ?? theater.seatingLayout.gapSeat ?? [];
        const finalTotalCapacity = totalCapacity ?? theater.totalCapacity;

        // Validate rows
        if (!Array.isArray(finalRows) || finalRows.length === 0) {
            throw new ApiError(400, "Seating layout rows must be a non-empty array");
        }

        // Validate columns
        if (typeof finalColumns !== "number" || finalColumns < 1) {
            throw new ApiError(400, "Seating layout columns must be a positive number");
        }

        // Validate gapSeat
        if (!Array.isArray(finalGapSeat)) {
            throw new ApiError(400, "gapSeat must be an array");
        }

        // Build valid seat map
        const normalizedRows = finalRows.map((row: string) => {
            if (typeof row !== "string" || !row.trim()) {
                throw new ApiError(400, "Each row must be a valid non-empty string");
            }
            return row.trim().toUpperCase();
        });

        const validSeats = new Set<string>();

        for (const row of normalizedRows) {
            for (let col = 1; col <= finalColumns; col++) {
                validSeats.add(`${row}${col}`);
            }
        }

        const normalizedGapSeats = finalGapSeat.map((seat: string) => {
            if (typeof seat !== "string" || !seat.trim()) {
                throw new ApiError(400, "Each gapSeat value must be a valid string");
            }
            return seat.trim().toUpperCase();
        });

        for (const seat of normalizedGapSeats) {
            if (!validSeats.has(seat)) {
                throw new ApiError(400, `Invalid gapSeat: ${seat}`);
            }
        }

        const uniqueGapSeats = new Set(normalizedGapSeats);
        if (uniqueGapSeats.size !== normalizedGapSeats.length) {
            throw new ApiError(400, "Duplicate seats found in gapSeat");
        }

        // Validate totalCapacity consistency
        const calculatedCapacity = (normalizedRows.length * finalColumns) - normalizedGapSeats.length;

        if (typeof finalTotalCapacity !== "number" || finalTotalCapacity < 1) {
            throw new ApiError(400, "Valid totalCapacity is required");
        }

        if (finalTotalCapacity !== calculatedCapacity) {
            throw new ApiError(
                400,
                `totalCapacity mismatch. Expected ${calculatedCapacity}, received ${finalTotalCapacity}`
            );
        }

        // Apply updates
        theater.totalCapacity = finalTotalCapacity;
        theater.seatingLayout = {
            rows: normalizedRows,
            columns: finalColumns,
            gapSeat: normalizedGapSeats
        };
    }

    // 9. Save
    await theater.save();

    return res.status(200).json(
        new ApiResponse(200, theater, "Theater updated successfully")
    );
});
// deleteTheater
export const deleteTheater = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // also here if active show cant delete the theater
    const { theaterId } = req.params;
    const partnerId = req.user?.id;
    if (!partnerId) {
        throw new ApiError(400, "UNAUTHORIZED TO DELETE THEATER")
    }
    if (!theaterId) {
        throw new ApiError(400, "NO SUCH THEATER FOUND TO DELETE")
    }
    const theater = await Theater.findById(theaterId)
    if (!theater) {
        throw new ApiError(400, "NO SUCH THEATER FOUND TO DELETE")
    }
    const venue = await Venue.findById(theater.venueId)
    if (!venue) {
        throw new ApiError(400, "NO SUCH VENUE FOUND TO DELETE")
    }
    if (venue.ownerId?.toString() !== partnerId.toString()) {
        throw new ApiError(403, "YOU ARE NOT AUTHORIZED TO DELETE THEATER IN THIS VENUE")
    }
    const upcomingShowExists = await Show.exists({
        theaterId: theater._id,
        startTime: { $gte: new Date() },
        status: { $in: ["Active", "Ongoing"] }
    });
    if (upcomingShowExists) {
        throw new ApiError(
            400,
            "Cannot delete theater because this theater has upcoming shows"
        );
    }
    await theater.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, "THEATER DELETED SUCCESSFULLY"))
})
// getPartnerTheaters
export const getPartnerTheaters = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const partnerId = req.user?.id;
    if (!partnerId) {
        throw new ApiError(400, "UNAUTHORIZED TO GET THEATERS")
    }
    const theaters = await Theater.find({
        venueId: {
            $in: await Venue.find({ ownerId: partnerId }).distinct('_id')
        }
    })
    return res.status(200).json(new ApiResponse(200, theaters, "THEATERS FETCHED SUCCESSFULLY"))
})
// getAllTheaters
export const getAllTheaters = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const theaters = await Theater.find()
    return res.status(200).json(new ApiResponse(200, theaters, "THEATERS FETCHED SUCCESSFULLY"))
})
// getTheaterDetails
export const getTheaterDetails = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { theaterId } = req.params;
    if (!theaterId) {
        throw new ApiError(400, "NO SUCH THEATER FOUND TO DELETE")
    }
    const theater = await Theater.findById(theaterId)
    if (!theater) {
        throw new ApiError(400, "NO SUCH THEATER FOUND TO DELETE")
    }
    return res.status(200).json(new ApiResponse(200, theater, "THEATER FETCHED SUCCESSFULLY"))
})
// getTheaterMovies
export const getMoviesByTheater = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { theaterId } = req.params;
    if (!theaterId) {
        throw new ApiError(400, "ENTER A VALID THEATER ID")
    }
    const theater = await Theater.findById(theaterId)
    if (!theater) {
        throw new ApiError(400, "NO SUCH THEATER EXIST")
    }
    const now = new Date()
    // Aggregate from shows 
    const movies = await Show.aggregate([
        {
            $match: {
                hallId: new mongoose.Types.ObjectId(theaterId as string),
                movieId: { $exist: true, $ne: null }, // basically movie should exist in shows model 
                status: { $ne: "Cancelled" },
                endTime: { $gte: now } // currently and upcoming shows only
            }
        },
        {
            $group: {
                _id: "$movieId",
            }
        },
        {
            $lookup: {
                from: "movies",
                localField: "_id",
                foreignField: "_id",
                as: "movieDetails"
            }
        },
        {
            $unwind: "$movieDetails"
        },
        {
            $match: {
                "movieDetails.isDeleted": false
            }
        },
        {
            $replaceRoot: {
                newRoot: "$movieDetails"
            }
        }, {
            $sort: {
                releaseDate: -1
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200, movies, "MOVIES FETCHED SUCCESSFULLY"))
})
// getTheaterLayout
export const getTheaterLayout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { theaterId } = req.params;
    if (!theaterId) {
        throw new ApiError(400, "NO SUCH THEATER FOUND TO DELETE")
    }
    const theater = await Theater.findById(theaterId)
    if (!theater) {
        throw new ApiError(400, "NO SUCH THEATER FOUND TO DELETE")
    }
    return res.status(200).json(new ApiResponse(200, theater.seatingLayout, "THEATER LAYOUT FETCHED SUCCESSFULLY"))

})