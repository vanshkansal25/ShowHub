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
export const resetPassword = asyncHandler(async(req:Request,res:Response)=>{
    const {newPassword,oldPassword} = req.body;
    const userId = req.user?.id;
    if(!userId){
        throw new ApiError(401,"Unauthorized");
    }
    const user = await User.findById(userId).select("+password");
    if(!user){
        throw new ApiError(404,"User not found");
    }
    const isOldPasswordValid = await user.isPasswordCorrect(oldPassword);
    if(!isOldPasswordValid){
        throw new ApiError(401,"Old password is incorrect");
    }
    user.password = newPassword;
    await user.save({validateBeforeSave:false});// to skip validation as we are not providing all fields
    return res.status(200).json(new ApiResponse(200,{},"Password reset successfully"));
})
// Generate refresh token Logic
export const refreshToken = asyncHandler(async(req:Request,res:Response)=>{
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken){
        throw new ApiError(401,"Refresh token not found, please login again");
    }
    try{
        const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET!) as any;
        const user = await User.findById(decoded.id);
        if(!user || user.refreshToken !== refreshToken){
            throw new ApiError(401,"Invalid refresh token, please login again");
        }
        const options = {
            httpOnly:true,
            secure:process.env.NODE_ENV === "production",
        }
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        user.refreshToken = newRefreshToken;
        user.save({validateBeforeSave:false});
        res.cookie("accessToken",newAccessToken,options);
        res.cookie("refreshToken",newRefreshToken,options);
        return res.status(200).json(new ApiResponse(200,{},"Tokens refreshed successfully"));
    }catch(error){
        throw new ApiError(401,"Invalid refresh token, please login again");
    }
})
// Get User Profile Logic
