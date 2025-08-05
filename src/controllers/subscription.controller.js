import mongoose, {isValidObjectId, ModifiedPathsSnapshot} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    // TODO: toggle subscription
       const {channelId} = req.params
    // params gives String not Id;
    const userId = req.user._id
    
    // Here It check if the Given Id is valid for mongoDB id or not (a 24-character hex string or a number that can be cast to ObjectId).
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel Id")
    }

    if (channelId === userId.toString()) {
        throw new ApiError(400, "Cannot subscribe to yourself")
    }
    // This check if userId is already a subscriber and channel is equal to above channelId
    const exisitng = await Subscription.findOne({ subscriber: userId, channel: channelId })

    if (exisitng) {
       await Subscription.deleteOne({ _id: exisitng._id})
       return res
       .status(200)
       .json(
        new ApiResponse(200, {}, "Unsubscribed from channel")
       )
    }else {
       await Subscription.create({ subscriber: userId, channel: channelId})
       return res
       .status(200)
       .json(
        new ApiResponse(200, {}, "Subscribed to channel")
       )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel Id")
    }
    // Detail of total subscribers.
    const subscribers = await Subscription.aggregate([
        {
            $match: {channel: mongoose.Types.ObjectId(channelId)}
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetail"
            }
        },{
            $unwind: "subscriberDetail" // This takes each element from subscriberDetail and create seperate document for each i.e one subscriber at a time not the array of subscriber.
        }, {
            $project:{
                _id: 0, // 0 = dont show id
                subcriberId: "$subscriberDetail._id",
                fullName: "$subscriberDetail.fullName",
                email: "$subscriberDetail.email"
            }
        }
    ]);
    // Total number of subscribers
    const totalSubscribers = subscribers.length;

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, {
                totalSubscribers,
                subscribers
            },
            "Subscribers list fetehed successfully"
        )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber Id")
    };
    const subscribedChannel = await Subscription.aggregate([
        {
            $match: {subscriber: mongoose.Types.ObjectId(subscriberId)}
        },{
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails"
            }
        },{
            $unwind: "$channelDetails"
        },{
            $project: {
                _id: 0,
                fullName: "$channelDetails.fullName",
                channelId: "$channelDetails._id",
                email: "$channelDetails.email"
            }
        }
    ])
    const totalSubscribedChannel = subscribedChannel.length;

    return res
    .status(200)
    .json(
        new ApiResponse(200, {
            totalSubscribedChannel,
            subscribedChannel
        },
        "Subscribed Channel detail fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}