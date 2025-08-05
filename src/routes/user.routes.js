import { Router } from "express";
import {
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountDetail, 
    updateUseravatar, 
    updateUserCoverImg} from '../controllers/user.controller.js'
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router
.route("/register")
.post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
    
router
 .route("/login").post(loginUser)

// Secured Route
router.route("/logout")
.post(verifyJWT ,logoutUser);
router.route("/refresh-token")
.post(refreshAccessToken)
router.route("/change-password")
.post(changeCurrentPassword)
router.route("/current-user")
.get(verifyJWT, getCurrentUser)
router.route("/update-account")
.patch(verifyJWT, updateAccountDetail)

// upload.single("avatar") = accepts one file upload from the request.
// Then, The file should be sent with the name "avatar" 
// Saves the uploaded file to the server temporarily
router.route("/avatar")
.patch(verifyJWT, upload.single("avatar"), updateUseravatar )
router.route("/cover-img")
.patch(verifyJWT, upload.single("coverImage"), updateUserCoverImg)

// As we have use params and declared username so,
router.route("/c/:username")
.get(verifyJWT, getUserChannelProfile)
router.route("/watch-history")
.get(verifyJWT, getWatchHistory)




export default router