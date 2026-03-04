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

export const loginUser = asyncHandler(async(req:Request,res:Response)=>{
    const {email,password} = req.body;
    if(!email || !password){
        throw new ApiError(400,"Email and password are required");
    }
    const user = await User.findOne({email}).select("+password");
    if(!user){
        throw new ApiError(401,"Invalid email or password");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid email or password");
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();
    res.cookie("accessToken",accessToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
    })
    res.cookie("refreshToken",refreshToken,{
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
    })
    return res.status(200).json(new ApiResponse(200,{user,accessToken,refreshToken},"User logged in successfully"));
});

// Logout Logic

export const logoutUser = asyncHandler(async(req:Request,res:Response)=>{
    const userId = req.user?.id;
    if(!userId){
        throw new ApiError(401,"Unauthorized");
    }
    await User.findByIdAndUpdate(userId,{
        $unset:{refreshToken:""}
    })
    const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV === "production",
    } 
    res.clearCookie("accessToken",options);
    res.clearCookie("refreshToken",options);
    return res.status(200).json(new ApiResponse(200,{},"User logged out successfully"));
    
})
// Reset Password Logic
// Generate refresh token Logic
// Get User Profile Logic
