import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    const userId = req.user._id;

    // Check for exisiting like on video by req.user._id;
    const existingLike = await Like.findOne({ likedBy: userId, video: videoId})
    if (existingLike) {
       await Like.deleteOne({ _id: existingLike._id})
       return res
       .status(200)
       .json(
         new ApiResponse(200, {}, "Unliked the video successfully")
       )
    } else {
       await Like.create({ likedBy: userId, video: videoId});
       return res
       .status(200)
       .json(
         new ApiResponse(200, {}, "Liked the video successfully")
       )
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
     if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid commentId")
    }
    const userId = req.user._id;
    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId})
    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id})
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment unliked successfully")
        )
    } else {
        await Like.create({ comment: commentId, likedBy: userId})
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment liked successfully")
        )
    }
}) 

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweetId")
    }
    const userId = req.user._id;

    const existingLike = await Like.findOne({ likedBy: userId, tweet: tweetId})
    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id})
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Tweet unliked successfully")
        )
    } else {
        await Like.create({ likedBy: userId, tweet: tweetId})
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Tweet liked successfully")
        )
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videosLikedByUser = await Like.aggregate([
        {
            // { $ne: null} means = Only include docu. where video field is not equal to null.
            $match: { likedBy: userId, video: { $ne: null} }
        },{
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'likedVideos'
            }
        },
        {  $unwind: '$likedVideos'},
        {  $skip: skip },
        {  $limit: limit},
        {  $project: {
                _id: 0,
                videoFile: '$likedVideos.videoFile',
                thumbnail: '$likedVideos.thumbnail',
                owner: '$likedVideos.owner',
                title: '$likedVideos.title',
                duration: '$likedVideos.duration'
            }
        }
    ])

    const totallikedVideos = await Like.countDocuments({ likedBy: userId, video: { $ne: null} });

    return res
    .status(200)
    .json(
        new ApiResponse(200, {
            videosLikedByUser,
            totallikedVideos
        },
        "Total liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}