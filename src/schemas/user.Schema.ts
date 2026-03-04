import {email, z} from "zod";

export const baseRegisterSchema = z.object({
    userName:z.string().min(3).max(30),
    email:z.string().email("Please enter a valid email address").trim().toLowerCase(),
    password:z.string().min(6).max(8),
})

export const CustomerRegisterSchema = baseRegisterSchema.extend({
    role:z.literal("CUSTOMER"),
    prefrences:z.object({
        city:z.string(),
        language:z.array(z.string()),
    }).optional()
})
// Specific schema for Staff (Admin/Partners)
export const StaffRegisterSchema = baseRegisterSchema.extend({
    role:z.enum(["ADMIN","THEATRE_PARTNER","EVENT_ORGANIZER"]),
})

// based on role we will validate the incoming data for registration using this discriminated union schema
export const RegisterSchema = z.discriminatedUnion("role",[
    CustomerRegisterSchema,
    StaffRegisterSchema,
])
