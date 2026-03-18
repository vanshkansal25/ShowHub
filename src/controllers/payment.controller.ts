import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";

// createPaymentIntent
export const createPaymentIntent = asyncHandler(async (req: Request, res: Response) => { })
// verifyPayment
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => { })
// refundPayment
export const refundPayment = asyncHandler(async (req: Request, res: Response) => { })
// getPaymentDetails
export const getPaymentDetails = asyncHandler(async (req: Request, res: Response) => { })
// getPaymentHistory
export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => { })

// getAllPayements --> FOR ADMIN
export const getAllPayements = asyncHandler(async (req: Request, res: Response) => { })
