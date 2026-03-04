import "express";

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
