import { Request, Response } from "express"
import { asyncHandler } from "../utils/asyncHandler"

// getSeatMap
export const getSeatMap = asyncHandler(async (req: Request, res: Response) => {

})
// getAvailableSeats
export const getAvailableSeats = asyncHandler(async (req: Request, res: Response) => {

})
// lockSeats  -- triggered via websocket
export const lockSeats = asyncHandler(async (req: Request, res: Response) => {

})
// releaseSeats -- triggered via websocket
export const releaseSeats = asyncHandler(async (req: Request, res: Response) => {

})
// getSeatStatus
export const getSeatStatus = asyncHandler(async (req: Request, res: Response) => {

})

// createSeatLayout
export const createSeatLayout = asyncHandler(async (req: Request, res: Response) => {

})
// updateSeatLayout
export const updateSeatLayout = asyncHandler(async (req: Request, res: Response) => {

})
// createSeatCatogory
export const createSeatCatogory = asyncHandler(async (req: Request, res: Response) => {

})
// updateSeatCatogory
export const updateSeatCatogory = asyncHandler(async (req: Request, res: Response) => {

})

// setSeatPricing
export const setSeatPricing = asyncHandler(async (req: Request, res: Response) => {

})
// updateSeatPricing
export const updateSeatPricing = asyncHandler(async (req: Request, res: Response) => {

})
