import { Request, Response } from "express"
import { asyncHandler } from "../utils/asyncHandler"
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError";
import { Show } from "../models/shows.model";
import { getCache, redis, setCache } from "../utils/redis";
import { ApiResponse } from "../utils/apiResponse";
import { Theater } from "../models/theaters.model";
import { Seat } from "../models/seats.model";
import { getIO } from "../sockets";


export const createSeatsForShow = asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;

    const show = await Show.findById(showId);
    if (!show) throw new ApiError(404, "Show not found");

    const theater = await Theater.findById(show.hallId);
    if (!theater) throw new ApiError(404, "Theater not found");

    const existingSeats = await Seat.findOne({ showId });
    if (existingSeats) throw new ApiError(400, "Seats already generated");

    const { rows, columns, gapSeat } = theater.seatingLayout;
    const seatsToCreate = [];

    // Map rows to pricing
    for (let i = 0; i < rows.length; i++) {
        const rowLabel = rows[i];
        const tier = show.pricing[i] || show.pricing[show.pricing.length - 1];

        for (let col = 1; col <= columns; col++) {
            const seatNumber = `${rowLabel}-${col}`;
            if (gapSeat.includes(seatNumber)) continue;

            seatsToCreate.push({
                showId: show._id,
                theaterId: theater._id,
                seatNumber,
                tierName: tier.name,
                price: tier.price,
                status: 'AVAILABLE'
            });
        }
    }

    // Direct insert without session
    const createdSeats = await Seat.insertMany(seatsToCreate);

    return res.status(201).json(
        new ApiResponse(201, { count: createdSeats.length }, "Seats generated successfully")
    );
});
// how whole seat booking system work -> getSeatMap to get the snapshot of the seat map of available and booked seats this is just a snapshot not a realtime thing , i will handle real time thing using web sockets because if i make this controller realtime there will be heavy load on database
// getSeatMap
export const getSeatMap = asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    if(!showId || !mongoose.Types.ObjectId.isValid(showId as string)){
        throw new ApiError(400, "Invalid Show Id");
    }
    const cacheKey = `seatmap:${showId}`
    const cachedData = await getCache(cacheKey);
    if(cachedData){
        return res.status(200).json(new ApiResponse(200,cachedData,"Seat map fetched successfully"))
    }
    const show = await Show.findById(showId).lean();
    if(!show || show.status == "Cancelled"){
        throw new ApiError(400,"Show not Found")
    }
    if(!show.hallId){
        throw new ApiError(400,"No hall assigned to this show");
    }
    // fetch hall + seats 
    const [hall,seats] = await Promise.all([
        Theater.findById(show.hallId).lean(),
        Seat.find({showId}).lean()
    ])
    if (!hall) {
        throw new ApiError(404, "Hall not found");
    }

    const response = {
        show:{
            _id: show._id,
            status:show.status,
            pricing:show.pricing
        },
        layout:hall.seatingLayout,
        seats
    }
    await setCache(cacheKey,response,60);
    return res.status(200).json(new ApiResponse(200,response,"Seat Map fetched Successfully"))
})
// getAvailableSeats
export const getAvailableSeats = asyncHandler(async (req: Request, res: Response) => {
    const { showId } = req.params;
    if(!showId || !mongoose.Types.ObjectId.isValid(showId as string)){
        throw new ApiError(400, "Invalid Show Id");
    }
    const show = await Show.findById(showId).lean();
    if(!show || show.status == "Cancelled"){
        throw new ApiError(400,"Show not Found")
    }
    if(!show.hallId){
        throw new ApiError(400,"No hall assigned to this show");
    }
    // fetch hall + seats 
    const [hall,seats] = await Promise.all([
        Theater.findById(show.hallId).lean(),
        Seat.find({
            showId,
            status:"AVAILABLE",
        }).lean()
    ])
    if (!hall) {
        throw new ApiError(404, "Hall not found");
    }

    const response = {
        show:{
            _id: show._id,
            status:show.status,
            pricing:show.pricing
        },
        layout:hall.seatingLayout,
        seats
    }
    return res.status(200).json(new ApiResponse(200,response,"Available Seats fetched Successfully"))
})
// lockSeats  -- triggered via websocket
export const lockSeats = asyncHandler(async (req: Request, res: Response) => {
    const io = getIO();
    const { showId } = req.params;
    const {seatNumbers} = req.body;
    const userId = req.user?.id;
    if(!showId || !seatNumbers || !Array.isArray(seatNumbers)){
        throw new ApiError(400,"Invalid Input")
    }
    if(!userId){
        throw new ApiError(400,"Unauthorized")
    }
    // generate keys to lock seats in redis 
    const lockKeys = seatNumbers.map((seat)=>`seat:lock:${showId}:${seat}`)

    // check if any seat is already locked

    const existLocked = await Promise.all(
        lockKeys.map((key)=> redis.get(key))
    )
    const lockedSeatIndex = existLocked.findIndex((val) => val !== null) //findindex--> The index of the first element that passes the test. Otherwise -1.
    if (lockedSeatIndex !== -1){
        throw new ApiError(
            409,
            `Seat ${seatNumbers[lockedSeatIndex]} is already locked`
        );
    }

    // now when i lock the seats only two things should happen either no seat is locked or every seatNumber is locked
    // basically like transaction in db if error occur rollback 
    // to achieve this thing in redis we have multi thing

    const multi = redis.multi();
    lockKeys.forEach((key) => {
        // multi.set(key, userId.toString(), "NX", "EX", 300); --> this doesnot work "NX" creates issue here 
        multi.call("SET",key, userId.toString(), "NX", "EX", 300); // --> NX here means it will only set the value if it NOT EXIST in redis making transaction atomic
    });

    // multi.exec() will execute all the commands in multi and return an array of results-->[null,"OK"], if any command fails (like if a seat got locked by another user in between) then it will not execute any command and return null

    const results = await multi.exec();
    const isSuccessful = results?.every((res) => res[1] === "OK");

    if (!isSuccessful) {
        await Promise.all(lockKeys.map((key) => redis.del(key)));
        throw new ApiError(409, "One or more seats are already locked or could not be reserved");
    }
    // Flow --> User opens seat page, client emit "join_show" which will make them join same show room with a showId and when some lock the seat server emit a event of seat locking 
    io.to(showId).emit("seat_locked",{
        seatNumbers,
        userId
    })
    console.log(`Seats ${seatNumbers} locked for show ${showId} by user ${userId}`);

    return res.status(200).json(
        new ApiResponse(200, { seatNumbers }, "Seats locked successfully")
    ); 

})
// releaseSeats -- triggered via websocket
export const releaseSeats = asyncHandler(async (req: Request, res: Response) => {
    // here i need to consider only the person who locks the seat can release it -- thats why i stored userId in redis with seat lock
    const io = getIO();
    const { showId } = req.params;
    const {seatNumbers} = req.body;
    const userId = req.user?.id;
    if(!showId || !seatNumbers || !Array.isArray(seatNumbers)){
        throw new ApiError(400,"Invalid Input")
    }
    if(!userId){
        throw new ApiError(400,"Unauthorized")
    }
    const lockKeys = seatNumbers.map((seat)=>`seat:lock:${showId}:${seat}`)

    // fetch existing locked keys
    const locks = await Promise.all(
        lockKeys.map((key)=> redis.get(key))
    )
    // which seats to be delete and which keys to be released

    const keysToDelete:string[] = [];
    const seatToRelease: string[] = [];

    locks.forEach((lockOwner,index)=>{
        if(lockOwner === userId.toString()){
            keysToDelete.push(lockKeys[index]);
            seatToRelease.push(seatNumbers[index]);
        }
    })
    // Delete only owned locks
    if(keysToDelete.length >0){
        await redis.del(keysToDelete)
    }

    io.to(showId).emit("seats_released", {
        seatNumbers: seatToRelease,
        userId
    });
    return res.status(200).json(
        new ApiResponse(
            200,
            { seatToRelease },
            "Seats released successfully"
        )
    );
})

