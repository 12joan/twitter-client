import express from 'express';
import { createClient as createRedisClient } from 'redis';
import RSS from 'rss';
import { getTweetsForUsername } from './twitter';
import { TTweet } from './twitter-api';

const redis = createRedisClient({ url: process.env.REDIS_URL });
redis.on('error', console.error);

redis.connect().then(() => {
  const app = express();

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || 'localhost';

  // Get tweets for routes starting with /:username
  app.use('/:username', async (req, res, next) => {
    let result;

    try {
      result = await getTweetsForUsername({
        redis: redis as any,
        username: req.params.username,
      });

    } catch (err) {
      console.error(err);
      res.status(500).send((err as any).message ?? 'Unknown error');
      return;
    }

    if (!result.ok) {
      res.status(
        result.error === 'user-id-does-not-exist-error'
          ? 404
          : 500
      ).send(result.error);
      return;
    }

    res.locals.tweets = result.data;
    next();
  });

  app.get('/:username', async (_req, res) => {
    res.send(res.locals.tweets);
  });

  app.get('/:username/rss', async (req, res) => {
    const { username } = req.params;
    const { flavour = 'default' } = req.query;
    const tweets = res.locals.tweets as TTweet[];

    const feed = new RSS({
      title: username,
      feed_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      site_url: `https://twitter.com/${username}`,
      custom_namespaces: {
        atom: 'http://www.w3.org/2005/Atom'
      }
    });

    for (const tweet of tweets) {
      const id = tweet.rest_id;
      const url = `https://twitter.com/${username}/status/${id}`;
      const date = tweet.legacy.created_at;
      const text = tweet.legacy.full_text;
      const mediaUrls = tweet.legacy.entities.media?.map((media) => media.media_url_https) ?? [];

      feed.item({
        title: flavour === 'slack'
          ? url
          : text,
        url: url,
        date,
        custom_elements: [{ 'dc:creator': username }],
        description: [
          text,
          ...mediaUrls.map((url: string) => flavour === 'slack'
            ? url
            : `<img src="${url}" />`
          ),
        ].join('\n'),
      });
    }

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());
  });

  app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
  });
});
