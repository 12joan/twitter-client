import express from 'express';
import { createClient as createRedisClient } from 'redis';
import RSS from 'rss';
import { getTweetsForUsername } from './twitter';
import { TTweet } from './twitter-api';

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

    // Feed metadata
    const feed = new RSS({
      title: username,
      feed_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      site_url: `https://twitter.com/${username}`,
      custom_namespaces: {
        atom: 'http://www.w3.org/2005/Atom',
      },
    });

    // For each tweet, add an item to the feed
    for (const tweet of tweets) {
      const id = tweet.rest_id;
      const url = `https://twitter.com/${username}/status/${id}`;
      const date = tweet.legacy.created_at;
      const text = tweet.legacy.full_text;
      const mediaUrls =
        tweet.legacy.entities.media?.map((media) => media.media_url_https) ??
        [];

      feed.item({
        title: flavour === 'slack' ? url : text,
        url: url,
        date,
        custom_elements: [{ 'dc:creator': username }],
        description: [
          text,
          ...mediaUrls.map((url: string) =>
            flavour === 'slack' ? url : `<img src="${url}" />`
          ),
        ].join('\n'),
      });
    }

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());
  });

  // Start the Express server
  app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
  });
});
