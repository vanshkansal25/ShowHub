import mongoose, { Schema } from "mongoose";



export interface IVenue{
    name:string;
    city:string;
    ownerId:mongoose.Types.ObjectId;
    address:string;
    contactDetails:{
        phone:string;
        email:string;
    }
}

const venueSchema = new Schema<IVenue>({
    name:{ type: String, required: true,index:true,trim:true },
    city:{ type: String, required: true,index:true,trim:true },
    ownerId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
        index:true
    },
    address:{ type: String, required: true },
    contactDetails:{
        phone:{ type: String, required: true },
        email:{ type: String, required: true }
    }
},{
    timestamps:true
})

export const Venue = mongoose.model<IVenue>("Venue",venueSchema)