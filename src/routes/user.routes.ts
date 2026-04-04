import { Router } from "express";
import {loginUser, logoutUser, refreshToken, registerUser, resetPassword } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const userRouter = Router();

userRouter.post("/register",registerUser)
userRouter.post("/login",loginUser)
userRouter.post("/logout",authMiddleware,logoutUser)
userRouter.post("/reset-Password",authMiddleware,resetPassword)
userRouter.post("/refresh-token",authMiddleware,refreshToken)

export default userRouter