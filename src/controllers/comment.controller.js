import mongoose from "mongoose"
import {Comment} from "../models/comments.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const objId = mongoose.Types.ObjectId(videoId);

    const ownerDetails = await Comment.aggregate([
        {
            $match: { video: objId}
        },{
            $lookup: {
                from: 'users', 
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerDetails'
            }
        }, { $unwind: '$ownerDetails'},
        { $sort: {createdAt: -1}},
        { $skip: skip},
        { $limit: limit},
        { $project: {
            _id: 1,
            content: 1,
            username: '$ownerDetails.username',
            avatar: '$ownerDetails.avatar',
        }}
    ])

    const totalComments = await Comment.countDocuments({ video: objId })

    return res
    .status(200)
    .json(
        new ApiResponse(200, {
            ownerDetails,
            totalComments
        }, 
      "Total comments on video fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    if (content.trim() === "" || !content) {
        throw new ApiError(400, "Comment content cannot be empty")
    }
    // This check if the video by videoId exits or not
    // .exits = fast and lighter
    // .findById = retrun Full document of videoId
    const videoExits = await Video.exists({ _id: videoId});
    if (!videoExits) {
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        owner: req.user._id,
        video: videoId,
    })

    return res
    .status(201)
    .json(
        new ApiResponse(201, {
            _id: comment._id,
            content: comment.content,
            video: comment.video,
            createdAt: comment.createdAt,
        }, "Comment created successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }