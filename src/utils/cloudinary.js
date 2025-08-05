import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

// Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) throw new Error("File not found");
        // upload the file on cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been upload successfully
        // console.log("FILE is upload to cloudinary",response.url);
        // fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        } // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

export {uploadOnCloudinary}