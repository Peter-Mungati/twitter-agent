import express from "express";
import { TwitterApi } from "twitter-api-v2";
import cron from "node-cron";
import dotenv from "dotenv";
import { createClient } from "redis";
import { deepSeekResponse, deepSeekResponsePerHour } from "./response";
import { geminiResponse } from "./gemini";
import { trendingNews } from "./news";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

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

const topAccountIds = [
  "44196397", // Twitter Dev account
  "2244994945", // Twitter API account
  "783214", // Twitter account
];

// Initialize Redis client with Redis URL and connect
const redisClient = createClient({
  url: redisUrl,
});
redisClient.connect().catch(console.error);
const cachePrefix = "twitter-bot";

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Tweet Agent API For BTC Bot",
      version: "1.0.0",
      description: "API documentation for the Tweet Agent BTC Bot",
    },
    // servers: [
    //   {
    //     url: "http://localhost:3007",
    //   },
    // ],
  },
  apis: ["./src/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Initialize Twitter client

const client = new TwitterApi({
  appKey,
  appSecret,
  accessToken,
  accessSecret,
});
const rwClient = client.readWrite;

/**
 * Cron Jobs
 * - Tweet every hour
 * - Reply to mentions every 20 minutes
 */

// Cron job to tweet every 2 hours
cron.schedule("0 */2 * * *", async () => {
  try {
    const articleTitles: any[] = await trendingNews();
    // Randomly select an article from the list
    const randomArticle =
      articleTitles[Math.floor(Math.random() * articleTitles.length)];
    const tweet = await geminiResponse(
      `Create tweet about degen/crypto latest news and headlines in relation to the following headline (max 200 characters, no hashtags nor emojis and use singular token tag (eg $BTC, $SOL, $ETH, etc) where necessary ): ${randomArticle}`
    );
    await client.v2.tweet(tweet);
    console.log(`Tweet sent: ${tweet}`);
  } catch (error) {
    console.error("Error sending tweet:", error);
  }
});

// // Cron job to reply to mentions every 20 minutes
cron.schedule("*/17 * * * *", async () => {
  try {
    const user = await client.v2.me();
    const mentions = await client.v2.userMentionTimeline(user.data.id);
    // We need to check last mention ID to avoid replying to the same mention from redis cache
    const lastMentionId = await redisClient.get(`${cachePrefix}:lastMentionId`);
    if (mentions.data.data.length > 0) {
      // Reply to all unReplied mentions after the last mention ID
      const unRepliedMentions = mentions.data.data.filter(
        (mention) => lastMentionId === null || mention.id > lastMentionId
      );

      if (unRepliedMentions.length === 0) {
        console.log("No new mentions to reply to.");
        return;
      }
      console.log(`Found ${unRepliedMentions.length} new mentions.`);
      for (const mention of unRepliedMentions) {
        const replyText = await geminiResponse(
          `Reply to this tweet like a regular person we loves degen and crypto (if no direct answer, don't give it, no hashtags nor emojis and use singular token tag (eg $BTC, $SOL, $ETH, etc) where necessary) : ${mention.text
            .replace(/@\w+/g, "")
            .trim()}`
        );
        await rwClient.v2.reply(replyText, mention.id);
        console.log(`Replied to mention: ${mention.id}`);
      }
      // Update the last mention ID in Redis
      await redisClient.set(
        `${cachePrefix}:lastMentionId`,
        mentions.data.data[0].id
      );
    } else {
      console.log("No new mentions found.");
    }
  } catch (error) {
    console.error("Error fetching user mentions:", error);
  }
});

/**
 * API Endpoints
 * - /tweet: Post a tweet
 * - /retweet/:id: Retweet a tweet by ID
 * - /like/:id: Like a tweet by ID
 * - /quote/:id: Quote a tweet by ID
 * - /mentions: Get user mentions
 * - /comment/:id: Comment on a tweet by ID
 */

// API endpoint to post a tweet
// app.post("/tweet", async (req, res) => {
//   try {
//     const { text } = req.body;
//     const tweet = await rwClient.v2.tweet(text);
//     res.json({ success: true, tweet });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

// // API endpoint to retweet
// app.post("/retweet/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await client.v2.me();
//     await client.v2.retweet(user.data.id, id);
//     res.json({ success: true, message: `Retweeted ${id}` });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

// // API endpoint to like a tweet
// app.post("/like/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await client.v2.me();
//     await rwClient.v2.like(user.data.id, id);
//     res.json({ success: true, message: `Liked ${id}` });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

// // API endpoint to quote tweet
// app.post("/quote/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { comment } = req.body;
//     const tweet = await rwClient.v2.tweet(
//       `${comment} https://twitter.com/user/status/${id}`
//     );
//     res.json({ success: true, tweet });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

// // API endpoint to get user mentions
// app.get("/mentions", async (req, res) => {
//   try {
//     const user = await client.v2.me();
//     const mentions = await client.v2.userMentionTimeline(user.data.id);
//     res.json({ success: true, mentions });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

// // API endpoint to comment on a tweet
// app.post("/comment/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { comment } = req.body;
//     const tweet = await rwClient.v2.reply(comment, id);
//     res.json({ success: true, tweet });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

// // API endpoint to get user timeline
// app.get("/timeline/:username", async (req, res) => {
//   try {
//     const { username } = req.params;
//     const user = await client.v2.userByUsername(username);
//     const timeline = await client.v2.userTimeline(user.data.id);
//     res.json({ success: true, timeline });
//   } catch (error) {
//     res.status(500).json({ success: false, error });
//   }
// });

/**
 * @swagger
 * /hourly:
 *   get:
 *     summary: Generate a tweet about the latest BTC news
 *     responses:
 *       200:
 *         description: Successfully generated a tweet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tweet:
 *                   type: string
 */
app.get("/hourly", async (req, res) => {
  try {
    const articleTitles: any[] = await trendingNews();
    // Randomly select an article from the list
    const randomArticle =
      articleTitles[Math.floor(Math.random() * articleTitles.length)];
    const tweet = await geminiResponse(
      `Create tweet about degen/crypto latest news and headlines in relation to the following headline (max 200 characters, no hashtags nor emojis and use singular token tag (eg $BTC, $SOL, $ETH, etc) where necessary ): ${randomArticle}`
    );

    res.json({
      success: true,
      tweet,
    });
  } catch (error) {
    console.error("Error making deepseek prompt:", error);
    res.status(500).json({ success: false, error });
  }
});

/**
 * @swagger
 * /tweet-response:
 *   post:
 *     summary: Get a tweet-style reply to a tweet-related prompt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully generated a tweet reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tweet:
 *                   type: string
 */
app.post("/tweet-response", async (req, res) => {
  try {
    const { prompt } = req.body;
    const tweet = await geminiResponse(
      `Reply to this tweet like a regular person we loves degen and crypto (if no direct answer, don't give it, no hashtags nor emojis and use singular token tag (eg $BTC, $SOL, $ETH, etc) where necessary) : ${prompt
        .replace(/@\w+/g, "")
        .trim()}`
    );

    res.json({
      success: true,
      tweet,
    });
  } catch (error) {
    console.error("Error making deepseek prompt:", error);
    res.status(500).json({ success: false, error });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
