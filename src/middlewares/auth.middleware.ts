import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import jwt from "jsonwebtoken";
import "express";
import { User } from "../models/user.model";

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        role: "CUSTOMER" | "ADMIN" | "THEATRE_PARTNER" | "EVENT_ORGANIZER";
        email: string;
      };
    }
  }
}


export const authMiddleware = asyncHandler(async(req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return next(new ApiError(401, "You are not logged in! Please log in to access this resource."));
  }
  const decoded:any = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET!);
  const currentUser = await User.findById(decoded?.id).select("-refreshToken");
  if (!currentUser) {
    return next(new ApiError(401, "The user belonging to this token does no longer exist."));
  }
  req.user = {id: currentUser._id.toString(), role: currentUser.role, email: currentUser.email};
  next();
})

export const authorizeRoles = (...roles: ("CUSTOMER" | "ADMIN" | "THEATRE_PARTNER" | "EVENT_ORGANIZER")[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(401, "You are not logged in! Please log in to access this resource."));
        }
        if (!roles.includes(req.user.role)) {
            return next(new ApiError(403, "You are not authorized to access this resource."));
        }
        next();
    };
}