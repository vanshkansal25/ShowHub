import mongoose,{Schema} from "mongoose";


export interface IMovie{
    title: string;
    slug: string; // for SEO
    description: string;
    duration: number; // in minutes
    language: string[];
    genre: string[];
    releaseDate: Date;
    rating: number; 
    totalReviews: number;
    posterUrl: string;
    isDeleted?: boolean; // For Soft Delete 
}
const movieSchema = new Schema<IMovie>({
    title: { type: String, required: true,index:true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    language: [{ type: String, required: true }],
    genre: [{ type: String, required: true,index:true }],
    releaseDate: { type: Date, required: true,index:true },
    rating: { type: Number, min: 0, max: 10 ,default:0},
    totalReviews: { type: Number, default: 0 },
    posterUrl: { type: String },
    isDeleted: { type: Boolean, default: false }
},{
    timestamps:true
})

/**
 * Creates a MongoDB text index on title and genre.
 * Enables full-text search using $text and $search.
 * Only one text index allowed per collection.
 * Normal index:
    Matches exact values
    Used for filtering like { title: "Inception" }

 * Text index:
    Allows searching by words
    Supports partial matches
    Supports multiple fields
 */
movieSchema.index({ title: 'text', genre: 'text' },{ language_override: 'search_language_ignore' });
export const Movie = mongoose.model<IMovie>("Movie",movieSchema);