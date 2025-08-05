import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    // 1. Parse query parameters with defaults
    const {
        page = 1,
        limit = 10,
        query, // search string for title/description
        sortBy = 'createdAt', // default sort field
        sortType = 'desc', // default sort order
        userId // optional filter by user
    } = req.query

    // 2. Build filter object for $match
    const match = {};
    if (query) {
        match.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ];
    }
    if (userId) {
        match.owner = userId;
    }

    // 3. Build sort object
    const sort = {};
    if (sortBy) {
        sort[sortBy] = sortType === 'asc' ? 1 : -1;
    }

    // 4. Calculate skip and limit for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const lim = parseInt(limit);

    // 5. Aggregation pipeline
    const pipeline = [
        { $match: match },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner',
            }
        },
        { $unwind: '$owner' },
        {
            $project: {
                title: 1,
                description: 1,
                duration: 1,
                videoFile: 1,
                thumbnail: 1,
                createdAt: 1,
                isPublished: 1,
                'owner._id': 1,
                'owner.fullName': 1
            }
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: lim }
    ];

    // 6. Get paginated videos
    const videos = await Video.aggregate(pipeline);

    // 7. Get total count for pagination info (separate count query)
    const totalVideos = await Video.countDocuments(match);

    // 8. Return videos and pagination info
    return res.status(200).json(
        new ApiResponse(200, {
            videos,
            page: parseInt(page),
            limit: lim,
            totalPages: Math.ceil(totalVideos / lim),
            totalResults: totalVideos
        }, 'Videos fetched successfully')
    );
})

const publishAVideo = asyncHandler(async (req, res) => {
    // 1. Get info from user
    const { title, description, duration } = req.body;

    // 2. Validation
    if ([title, description, duration].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // 3. Check for the video file and its path
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required");
    }

    // 4. Upload the video and thumbnail to cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile?.url) {
        throw new ApiError(400, "Video upload failed");
    }
    if (!thumbnailFile?.url) {
        throw new ApiError(400, "Thumbnail upload failed");
    }

    // console.log(req.user)
    // 5. Create video object in DB
    const video = await Video.create({
        title,
        description,
        duration: Number(duration),
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        owner: req.user._id,
    });

    // 6. Return response
    return res
    .status(201)
    .json(
        new ApiResponse(
            200, 
            video,
            "Video uploaded successfully")
    );
})

const getVideoById = asyncHandler(async (req, res) => {
   // 1. get videoId by req.params
   // 2. check if u get the videoId or not
   // 3. check for the videoId by Video.findById i.e. in mongoDB by Id where u should convert String(_id) into number
   // 4. Check if there Id exists or not
   // 5. Return the response
        // 1.
   const { videoId } = req.params
     // 2.
     if (!mongoose.Types.ObjectId.isValid(videoId)) {
         throw new ApiError(400, "Invalid videoId")
     }
     // 3.
     const video = await Video.findById(videoId).populate('owner','fullName')
     // 4.
     if (!video) {
        throw new ApiError(400, "Video not found")
     }
     // 5.
     return res
     .status(200)
     .json(
        new ApiResponse(
            200, video, "Video fetched successfully"
        )
     )
})

const updateVideo = asyncHandler(async (req, res) => {
   const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    // 1. validate videoId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }
    // 2. Find the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    // 3. Extract update fields from req.body
    const { title, description, duration} = req.body
    // 4. If a new thumbnail is uploaded then upload it in cloudinary
    let thumbnailUrl = video.thumbnail;
    if (req.file) {
       const updatedThumbnail = await uploadOnCloudinary(req.file.path)
       if (!updatedThumbnail?.url) {
        throw new ApiError(400, "Thumbnail upload failed")
       }
       thumbnailUrl = updatedThumbnail.url;
    }
    // 5. Update the video fields.
    if (title) video.title = title;
    if (description) video.description = description;
    if (duration) video.duration = Number(duration)
    if (thumbnailUrl) video.thumbnail = thumbnailUrl;
    // 6. Save the updated video
    await video.save()
    // 7. Return the updated video
    return res
    .status(200)
    .json(
        new ApiResponse( 200, video , "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    // 1. get the videoId by req.params
    const { videoId } = req.params
    // 2. Validate the videoId
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid VideoId")
    }
    // 3. Match the id in Database
    const video = await Video.findById(videoId)
    if (!videoId) {
        throw new ApiError(400, "Video not found")
    }
    // 4. Delete the video from database
    await Video.deleteOne({_id: videoId});
    // 5. Return success response
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    // 1. get the videoId by req.params
    const { videoId } = req.params
    // 2.Validate the id
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid VideoId")
    }
    // 3. Match the id in database
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "Video not found")
    }
    // 4. Toggle the isPublished field
    video.isPublished = !video.isPublished;
    // 5. Save the updated video
    await video.save();
    // 6. return updated Video
    return res
    .status(200)
    .json(
        new ApiResponse(200, video, "Video publish status toggled successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}