
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";

export const createBooking = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

})
// getBookingById
export const getBookingById = asyncHandler(async (req: Request, res: Response) => {

})
// getUserBookings
export const getUserBookings = asyncHandler(async (req: Request, res: Response) => {

})
// cancelBooking
export const cancelBookings = asyncHandler(async (req: Request, res: Response) => {

})
// validateQR
export const validateQR = asyncHandler(async (req: Request, res: Response) => {

})
// downloadTicket
export const downloadTicket = asyncHandler(async (req: Request, res: Response) => {

})
// getShowBookings
export const getShowBookings = asyncHandler(async (req: Request, res: Response) => {

})
// getEventBookings
export const getEventBookings = asyncHandler(async (req: Request, res: Response) => {

})

