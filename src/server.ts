import express from 'express';
import { createClient as createRedisClient } from 'redis';
import { getTweetsForUsername } from './twitter';
import { TTweet } from './twitter-api';
import { createUserRSSFeed, RSS_FLAVOURS, TRSSFlavour } from './rss';

/**
 * Initialize the Redis server. The URL should be specified in the environment
 * variable REDIS_URL.
 */
const redis = createRedisClient({ url: process.env.REDIS_URL });
redis.on('error', console.error);

/**
 * Express server config. Customise the host and port using the environment
 * variables HOST and PORT.
 */
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || 'localhost';

redis.connect().then(() => {
  const app = express();

  // Middleware. Get Tweets for routes starting with /:username.
  app.use('/:username', async (req, res, next) => {
    let result;

    try {
      result = await getTweetsForUsername({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        redis: redis as any,
        username: req.params.username,
      });
    } catch (err) {
      console.error(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.status(500).send((err as any).message ?? 'Unknown error');
      return;
    }

    if (!result.ok) {
      res
        .status(result.error === 'user-id-does-not-exist-error' ? 404 : 500)
        .send(result.error);
      return;
    }

    res.locals.tweets = result.data;
    next();
  });

  // JSON endpoint
  app.get('/:username', async (_req, res) => {
    res.send(res.locals.tweets);
  });

  // RSS endpoint
  app.get('/:username/rss', async (req, res) => {
    const { username } = req.params;
    const { flavour = 'default' } = req.query;
    const tweets = res.locals.tweets as TTweet[];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!RSS_FLAVOURS.includes(flavour as any)) {
      res.status(400).send(`Invalid flavour: ${flavour}`);
      return;
    }

    const feed = createUserRSSFeed({
      username,
      feedUrl: req.protocol + '://' + req.get('host') + req.originalUrl,
      tweets,
      flavour: flavour as TRSSFlavour,
    });

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());
  });

  // Start the Express server
  app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
  });
});
