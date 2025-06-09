import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}))// to extend the url Like add some params in url name
app.use(express.static("public")) //to access to file like favion, pic other.
app.use(cookieParser())
export { app }