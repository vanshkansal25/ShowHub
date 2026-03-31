import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import http from "http";
import connectDB from "./config/db";
import userRouter from "./routes/user.routes";
import movieRouter from "./routes/movies.routes";
import eventRouter from "./routes/events.routes";
import theaterRouter from "./routes/theaters.routes";
import showRouter from "./routes/shows.routes";
import venueRouter from "./routes/venues.routes";
import { initSocket } from "./sockets";
import seatRouter from "./routes/seats.routes";
import bookingRouter from "./routes/booking.routes";

//Express alone != WebSocket server , socketIo need a http server instance
const app: Application = express();
const server = http.createServer(app);

initSocket(server)

const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.get("/api/v1/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    service: "ShowHub-Backend",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/v1/auth", userRouter)
app.use("/api/v1/movies", movieRouter)
app.use("/api/v1/events", eventRouter)
app.use("/api/v1/theaters", theaterRouter)
app.use("/api/v1/shows",showRouter)
app.use("/api/v1/venues",venueRouter)
app.use("/api/v1/seats",seatRouter)
app.use("/api/v1/bookings",bookingRouter)
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(
        `Server is running on port ${PORT} and MongoDB is connected successfully`,
      );
    });
  })
  .catch((err) => {
    console.log("Failed to connect to DB. Server not started", err);
  });
