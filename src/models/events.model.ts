
import mongoose,{Schema} from "mongoose";

export interface IEvent{
    title: string;
    slug:string;
    organizerId: mongoose.Types.ObjectId; // Reference to the Event Organizer (User ID)
    category: string; // e.g., Concert, Theater, Sports
    description: string;
    date: Date;
    time: string; // e.g., "19:30" 
    //TODO : Add endDate and endTime for multi-day events AND START DATE AND START TIME for recurring events
    venueId: mongoose.Types.ObjectId;
    city: string;
    isSoldOut: boolean;
}

const eventSchema = new Schema<IEvent>({
    title: { type: String, required: true,index:true,trim:true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true,index:true },
    category: { type: String, required: true,index:true },
    description: { type: String, required: true },
    date: { type: Date, required: true,index:true },
    time: { type: String, required: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'Venue', required: true },
    city: { type: String, required: true,index:true},
    isSoldOut: { type: Boolean, default: false }
},{
    timestamps:true
})

eventSchema.index({ title: 'text', category: 'text', city: 'text' });
eventSchema.index({ city: 1 }, { partialFilterExpression: { isSoldOut: false } }); // This keeps the index small and extremely fast because it ignores all the "Sold Out" events that people rarely search for.

export const Event = mongoose.model<IEvent>("Event",eventSchema);