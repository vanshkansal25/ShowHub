import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import jwt from "jsonwebtoken";
import { UserDocument } from "../models/user.model";
import { RegisterSchema } from "../schemas/user.Schema";



export const generateAccessToken = (user: UserDocument) => {
  const payload = {
    id: user._id,
    role: user.role,
    email: user.email,
  };
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY! as any,
    algorithm: "HS256",
  });
};

export const generateRefreshToken = (user: UserDocument) => {
    const payload ={
        id: user._id,
        role: user.role,
        email: user.email,
    }
    return jwt.sign(payload,process.env.REFRESH_TOKEN_SECRET!,{
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY! as any,
        algorithm:"HS256",
    })
}


// Register Logic

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = RegisterSchema.parse(req.body);
    const existingUser = await User.findOne({$or:[{email:validatedData.email},{userName:validatedData.userName}]});
    if(existingUser){
        throw new ApiError(400,"User with this email or username already exists");
    }
    const newUser = new User({
        ...validatedData,
        walletBalance:0,
    })
    await newUser.save();

    const createdUser = await User.findById(newUser._id).select(
        "-refreshToken"
    )
    const accessToken = generateAccessToken(newUser);
    res.cookie("accessToken",accessToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
    })

    return res.status(201).json(new ApiResponse(201,createdUser,`${validatedData.role} registered successfully!`));
});
// Login Logic


// Logout Logic
// Reset Password Logic
// Generate refresh token Logic
// Get User Profile Logic
