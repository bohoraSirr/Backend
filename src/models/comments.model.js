import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
   content: { 
    type: String,
    required: true
   },
   video: {
    type: Schema.Types.ObjectId,
    ref: "Video"
   },
   owner: {
    type: Schema.Types.ObjectId,
    ref: "User"
   }
}, { timestamps: true})

// Paginate limits from where to where shoe the comment.
commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema)