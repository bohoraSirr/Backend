import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    // 1. get content field
    const { content } = req.body
    // 2. Check for content is empty or not.
    if (!content || content.trim() == "") {
        throw new ApiError(400, "Content cannot be empty")
    }
    // 3. Check for req.id in database  /// It is done by verfiyJWT middleware
    // if (!req.user || !req.user._id) { 
    //     throw new ApiError(401, "Unauthorized: User not authenticated");
    // }
    // 4. Create tweet with owner and content
    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    });
    // 5. Return the response
    return res
    .status(201)
    .json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    // 1. Ensure user is authenticated
    // if (!req.user || !req.user._id) {
    //     throw new ApiError(401, "Unauthorized: User not authenticated");
    // }

    // 2. Extract user ID
    const userId = req.user._id;

    // 3. Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // 4. Query tweets
    const tweets = await Tweet.find({ owner: userId })
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(limit)

    // 5. Count the number of tweets
    const totalTweets = await Tweet.countDocuments({ owner: userId})

    // 5. Return response
    return res.status(200).json(
        new ApiResponse(200, {
            tweets,
            page,
            limit,
            totalPages: Math.ceil(totalTweets / limit),
            totalResults: totalTweets
        }, "User tweets fetched successfully")
    );
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id")
    }
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    // Authorization: only owner can update
    // if (tweet.owner.toString() !== req.user._id.toString()) {
    //     throw new ApiError(401, "Not authorized to update this tweet")
    // }
    // Get the content from body and update the content of tweet.
    const {content} = req.body
    if (content !== undefined) {
        if (content.trim() === "") {
            throw new ApiError(400, "content cannot be empty")
        }
        tweet.content = content;
    }

    await tweet.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    )

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id")
    }
    // Authorization: Only owner can delete the tweet
    // if (tweet.owner.toString() !== req.user._id.toString()) {
    //     throw new ApiError(401, "Not authorized to delete this tweet")
    // }
    // .findOneAndDelete is one atomic operation to find and delete the matching docu. at once
    const tweet = await Tweet.findOneAndDelete({_id: tweetId})
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}