import mongoose,{ Schema, HydratedDocument } from "mongoose";
import bcrypt from "bcrypt";


/**
 * HydratedDocument<T>
 *
 * Represents a fully functional Mongoose document created from a schema.
 *
 * It combines:
 * - Your raw interface type (T)
 * - Mongoose document properties (_id, save, isModified, etc.)
 * - Instance methods
 * - Virtuals
 *
 * In short:
 * Interface (T) = plain data shape
 * HydratedDocument<T> = real Mongoose document with all features
 *
 * Used mainly for typing `this` inside hooks and instance methods.
 */

export interface IUser {
  userName: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "ADMIN" | "THEATRE_PARTNER" | "EVENT_ORGANIZER";
  walletBalance: number;
  prefrences?: {
    city?: string;
    language?: string[];
  };
  refreshToken?: string;
}

// Defining the Methods interface for TypeScript to recognize them on the instance
interface IUserMethods {
  isPasswordCorrect(password: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser,IUserMethods>;

const userSchema = new Schema<IUser,{},IUserMethods>({
    userName :{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    password:{
        type:String,
        required:true,
        select:false,// to prevent it leak in while querying
    },
    role:{
        type:String,
        enum:['CUSTOMER','ADMIN','THEATRE_PARTNER','EVENT_ORGANIZER'],
        default:'CUSTOMER'
    },
    walletBalance:{
        type:Number,
        default:0,
        min:0   
    }, // For Refunds
    prefrences:{
        city:{
            type:String,
            index:true,
        },
        language:[String]
    },
    refreshToken:{
        type:String,
    }

},{
    timestamps:true
})

userSchema.pre("save",async function(this:UserDocument){
    if(!this.isModified("password"))return;
    this.password = await bcrypt.hash(this.password,10);
})
userSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
    if (!this.password) {
        throw new Error("Password field not selected in query");
    }
    return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser, mongoose.Model<IUser, {}, IUserMethods>>("User", userSchema);

/**
 * mongoose.model<DocType, ModelType>()
 *
 * DocType   → Shape of the document (your interface, e.g., IUser)
 * ModelType → Full model type (used when adding custom instance methods,
 *             statics, or query helpers)
 *
 * In short:
 * First generic  = document structure
 * Second generic = model definition (advanced usage)
 *
 * Usually you only need the first generic.
 * Use the second when you define custom methods/statics.
 */