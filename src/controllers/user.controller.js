import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from 'cloudinary';
import mongoose from "mongoose";


// This create the Access and Refresh token by calling methods from user.model.js 
const generateAccessAndRefreshTokens = async (userId) => {
    try {
       
       const user = await User.findById(userId)
    //    console.log("user = ",user)
       const accessToken = user.generateAccessToken()
        // console.log("5. Access token generated:", accessToken ? "Success" : "Failed"); // Modify
       const refreshToken = user.generateRefreshToken()

    //    console.log("accessToken = ",accessToken)
    //    console.log("refreshToken = ",refreshToken)

       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave: false})

       return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user info from frontend
    // validation - not empty 
    // check if user already exits: the name, email
    // check for avatar and coverImage
    // upload the img in cloudinary
    // create user obj - create entry in db
    // remove password and token field from response
    // check for user creation 
    // return response


    // Step 1 - get user info.
    const {fullName, email, password, username} = req.body
        // console.log(req.body); : See this part
    

    // Step 2 - Validation -- not empty
    if (
        [fullName, email, password, username].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required.")
    }

    // Step 3 - Check if user already exits.
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists")
    }

    // Step 4 - Check for avatar and coverImage.
 //req.body = given by express But req.files = given by multer( middleware )
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(req.files)
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;


    //This code helps to classical check if coverImage is present in req.files or not 
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // Step 5 - Upload avatar and coverImage on Cloudinary.
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "avatar file is required")
    }

    // Step 5 - Create User Object
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url,
        username: username.toLowerCase(),
        email,
        password,
    })

    // Step 6 - Remove the password and refreshToken for the response to be shown to user.
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200, 
            createdUser, 
            "User registered Successfully"
        )
    )
})

const loginUser = asyncHandler( async(req, res) => {
    // req body - data
    // check username or email
    // find user
    // check password
    // create access and refresh token
    // send cookies
    // send response

    // Step 1 - Create req body
    // console.log("req.body =", req.body);
    const { username, email, password} = req.body

    // Step 2 - check for email or username
    if (!username && !email)
    // if (!(username || email)) 
        {
        throw new ApiError(400, "Username or email is required")
    }

    // Step 3 - Find the user in MongoDB by mongoose
    const user = await User.findOne({
        $or: [{email}, {username}]
    })
    if (!user) {
        throw new ApiError(404, "User doesn't exist")
    }

    // Step 4 - Check Password
    const IsPasswordValid = await user.isPasswordCorrect(password)

    if (!IsPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // Step 5 - Generate Refresh and Access Token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    // This method help to remove the password and refreshToken. (Optional Step)
    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    //Step 6- Send cookies by Cookie-parser
    const options = { 
        httpOnly: true, // this cannot be changed by frontend although they can be visible.
        secure: true
    }
    return res
    .status(200)
    // cookie have left side key and right side values.
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User is logged successfully"
        )
    )
})

const logoutUser = asyncHandler( async(req, res) => {
    // For logout, we create auth.middleware to check user
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken  

   if (!incomingRefreshToken) {
       throw new ApiError(401, "Unauthorized request")
   }

try {
       // Jwt provide decoded token
       const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
       )
    
       const user = await User.findById(decodedToken?._id)
    
       if (!user) {
            throw new ApiError(401, "Invalid refresh token");
       }
    
       // Here We check the incomingRefreshToken by user and already present refreshToken in model
       if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh Token is expired or used")
       }
    
       const options = {
        httpOnly: true,
        secure: true,
       }
    
       // This is used to generate Refresh and Access Token. 
       const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
       return res
       .status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", newRefreshToken, options)
       .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken },
            "Access token refreshed"
        )
       )
} catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
     }
})

const changeCurrentPassword = asyncHandler ( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword) //gives truw or false

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, {}, "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler ( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200, req.user, "Account details updated successfully"
        )
    )
})

const updateAccountDetail = asyncHandler ( async ( req, res) => {
    const {fullName, email} = req.body

    if (!fullName?.trim() || !email?.trim()) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        }, {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
})

const updateUseravatar = asyncHandler ( async (req, res) => {
    const avatarLocalPath = req.file?.path // check for the path of img

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is missing")
    }

    // Get the current user to access the old avatar URL
    const userPerson = await User.findById(req.user?._id);
    if (userPerson && userPerson.avatar) {
        // Extract public_id from the old avatar URL
        const publicIdMatch = userPerson.avatar.match(/\/([^/]+)\.[a-zA-Z]+$/);
        if (publicIdMatch && publicIdMatch[1]) {
            const publicId = publicIdMatch[1];
            // Import and use cloudinary.v2.uploader.destroy to delete the old image
            await cloudinary.uploader.destroy(publicId);
        }
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar image updated successfully")
    )

})

const updateUserCoverImg = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?._id

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage) {
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse( 200, user, "Cover Image updated successfully")
    )
})

// Here  used MongoDB aggregation pipeline like: $match, $lookup, $cond, $in, $addFields, $size, $projet
const getUserChannelProfile = asyncHandler(async (req, res) => {
     // This help to get the url after /..
      const {username} = req.params

      if (!username) {
        throw new ApiError(400, "Username is missing")
      }

      const channel = await User.aggregate([
        {
            $match: {
                 // It check the username that is given with stored MongoDB and if true then only excecute the code..
                username: username?.toLowerCase()
            }
        },
         {
            $lookup: {
                // This collect the channel's subscribers no. by looking up to MongoDB.
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                // This collect the channel  subscribered to other channel no. by looking up to MongoDB.
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                // $size does the calculation to count the subs. number
                subscribersCount: {
                    // $ treats the "subscribers" as field not as string.
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                // Here 1 = all the field to show
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1
            }
        }
      ])

      if (!channel?.length) {
        throw new ApiError(404, "Channel doesn't exists")
      }
    //   console.log(channel)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, channel[0] , "User channel fetched successfully"
        )
    )
})

const getWatchHistory = asyncHandler( async (req, res) => {
   const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            // As all data of array is stored in owner field.
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory, 
            "Watch History Fetched"
        )
    )

})


export {
     registerUser,
     loginUser,
     logoutUser,
     refreshAccessToken,
     changeCurrentPassword,
     getCurrentUser,
     updateAccountDetail,
     updateUseravatar,
     updateUserCoverImg,
     getUserChannelProfile,
     getWatchHistory
    }

