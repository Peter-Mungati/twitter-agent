import express from "express";
import { TwitterApi } from "twitter-api-v2";
import cron from "node-cron";
import dotenv from "dotenv";
import { createClient } from "redis";

// Environment variables
// Load environment variables from .env file
dotenv.config();

const appKey = process.env.API_KEY;
const appSecret = process.env.API_SECRET;
const accessToken = process.env.ACCESS_TOKEN;
const accessSecret = process.env.ACCESS_SECRET;
const redisUrl = process.env.REDIS_URL;

// Check if all required environment variables are set
if (!appKey || !appSecret || !accessToken || !accessSecret || !redisUrl) {
  console.error("Missing required environment variables");
  process.exit(1);
} else {
  console.log("All required environment variables are set");
}

// Initialize Redis client with Redis URL and connect
const redisClient = createClient({
  url: redisUrl,
});
redisClient.connect().catch(console.error);
const cachePrefix = "twitter-bot";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Twitter client

const client = new TwitterApi({
  appKey,
  appSecret,
  accessToken,
  accessSecret,
});
const rwClient = client.readWrite;

// // Cron job to tweet every hour
// cron.schedule("0 * * * *", async () => {
//   try {
//     const tweet = `Automated Tweet at ${new Date().toLocaleTimeString()}`;
//     await rwClient.v2.tweet(tweet);
//     console.log(`Tweet sent: ${tweet}`);
//   } catch (error) {
//     console.error("Error sending tweet:", error);
//   }
// });

// Cron job to reply to mentions every 20 minutes
cron.schedule("*/20 * * * *", async () => {
  try {
    const user = await client.v2.me();
    const mentions = await client.v2.userMentionTimeline(user.data.id);
    // We need to check last mention ID to avoid replying to the same mention from redis cache
    const lastMentionId = await redisClient.get(`${cachePrefix}:lastMentionId`);
    if (mentions.data.data.length > 0) {
      const latestMention = mentions.data.data[0];
      if (lastMentionId !== latestMention.id) {
        await rwClient.v2.reply(`Thanks for the mention!`, latestMention.id);
        console.log(`Replied to mention already: ${latestMention.id}`);
        // Update last mention ID in Redis cache
        await redisClient.set(`${cachePrefix}:lastMentionId`, latestMention.id);
      }
    } else {
      console.log("No new mentions found.");
    }
  } catch (error) {
    console.error("Error fetching user mentions:", error);
  }
});

// API endpoint to post a tweet
app.post("/tweet", async (req, res) => {
  try {
    const { text } = req.body;
    const tweet = await rwClient.v2.tweet(text);
    res.json({ success: true, tweet });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// API endpoint to retweet
app.post("/retweet/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await client.v2.me();
    await client.v2.retweet(user.data.id, id);
    res.json({ success: true, message: `Retweeted ${id}` });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// API endpoint to like a tweet
app.post("/like/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await client.v2.me();
    await rwClient.v2.like(user.data.id, id);
    res.json({ success: true, message: `Liked ${id}` });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// API endpoint to quote tweet
app.post("/quote/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const tweet = await rwClient.v2.tweet(
      `${comment} https://twitter.com/user/status/${id}`
    );
    res.json({ success: true, tweet });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// api endpoint to get user mentions
app.get("/mentions", async (req, res) => {
  try {
    const user = await client.v2.me();
    const mentions = await client.v2.userMentionTimeline(user.data.id);
    res.json({ success: true, mentions });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
