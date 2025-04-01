import express from "express";
import { TwitterApi } from "twitter-api-v2";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const appKey = process.env.API_KEY;
const appSecret = process.env.API_SECRET;
const accessToken = process.env.ACCESS_TOKEN;
const accessSecret = process.env.ACCESS_SECRET;

if (!appKey || !appSecret || !accessToken || !accessSecret) {
  console.error("Missing required environment variables");
  process.exit(1);
} else {
  console.log("All required environment variables are set");
}

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
    await rwClient.v2.retweet(process.env.TWITTER_USER_ID!, id);
    res.json({ success: true, message: `Retweeted ${id}` });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

// API endpoint to like a tweet
app.post("/like/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await rwClient.v2.like(process.env.TWITTER_USER_ID!, id);
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
