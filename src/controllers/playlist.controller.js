import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { videos } from "../models/videos.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
        const { name, description } = req.body;
    // 1. Validate input
    if (!name || name.trim() === "") {
        throw new ApiError(400, "Playlist name is required");
    }
    // 2. Create playlist (assuming req.user._id is the owner)
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id,
        videoss: [] // start with empty videoss array
    });
    // 3. Return response
    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    );
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists

    const {userId} = req.params
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid userId")
    }
    // This code check if the user is owner or not.
    if (req.user._id.toString() !== userId) {
        throw new ApiError(403, "Forbidden: Cannot access other user's playlists")
    }
    // For pagination 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Use to find the playlist by userId
    const playlists = await Playlist.find({ owner: userId})
    .sort({ createdAt: -1})
    .skip(skip)
    .limit(limit)

    const totalPlaylists = await Playlist.countDocuments({ owner: userId})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {
            playlists,
            page,
            limit,
            totalPages: Math.ceil(totalPlaylists / limit),
            totalResults: totalPlaylists
        }, "Playlists fetched successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }

    const playlist = await Playlist.findById(playlistId)
    .populate('videos');

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            playlist,
           "Playlist fetched successfully by Id"
        )
    )
})

const addvideosToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlistId ")
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId ")
    }
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    // Check for the authorized owner only
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only owner can edit this playlist")
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        // This add the video that are not already present in the playlist.
        { $addToSet: { videos: videoId } },
        { new: true}
    ).populate('videos')
    
    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }
    ///////////////////////////////////////////////////////////
    /// ALTERNATIVE: UPDATE ONLY IF THE USER IS THE OWNER /////
    ///////////////////////////////////////////////////////////
    // const updatedPlaylist = await Playlist.findOneAndUpdate({ _id: playlistId, owner: req.user._id},
    //     { $addToSet: { videos: videoId}},
    //     { new: true}
    // ).populate('videos');
    // if (!updatedPlaylist) {
    //     throw new ApiError(404, "Playlist not found or you are not the owner.")
    // }

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

const removevideosFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove videos from playlist
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
         throw new ApiError(404, "Playlist not found")
    }

    // Check for owner of playlist
    if (playlist.owner.toString() !== req.user._id) {
        throw new ApiError(403, "Forbidden: Only owner can edit this playlist")
    }

    const updatedplaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, owner: req.user._id},
        { $pull: { videos: videoId} },
        { new: true}
    ).populate('videos');

    return res
    .status(200)
    .json(
        new ApiResponse(200, updatedplaylist, "Video deleted successfully from the playlist")
    )
})
 
const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id")
    }

    ///// EFFECTIVE CODE //////
    // const deletedPlaylist = await Playlist.findOneAndDelete({ _id: playlistId, owner: req.user._id})
    // if (!deletePlaylist) {
    //     throw new ApiError(404, "Playlist not found or you are not the owner")
    // }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only owner can edit this playlist")
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    )
})

const updatedPlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const {name, description} = req.body;
    //TODO: update playlist
    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
            throw new ApiError(400, "Invalid playlist Id");
    }
    const updatedplaylist = await Playlist.findById(playlistId)
    if (!updatedplaylist) {
            throw new ApiError(404, "Playlist not found");
    }
    if (updatedplaylist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Forbidden: Only owner can edit this playlist");
    }
    // Check for if name, description is undefined or not
    if (name !== undefined) {
        if (name.trim() === "") {
            throw new ApiError(400, "Name cannot be empty");
        }
        updatedplaylist.name = name;
    }
    if (description !== undefined) {
        if (description.trim() === "") {
            throw new ApiError(400, "Description cannot be empty");
        }
        updatedplaylist.description = description;
    }

    await updatedplaylist.save();

    return res
    .status(200)
    .json(
        new ApiResponse( 200, updatedplaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addvideosToPlaylist,
    removevideosFromPlaylist,
    deletePlaylist,
    updatedPlaylist
}