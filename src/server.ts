import express from 'express';
import { createClient as createRedisClient } from 'redis';
import RSS from 'rss';
import { fetchTweets } from './twitter';

const redis = createRedisClient({ url: process.env.REDIS_URL });
redis.on('error', console.error);

redis.connect().then(() => {
  const app = express();

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || 'localhost';

  app.get('/:username', async (req, res) => {
    try {
      const result = await fetchTweets(redis as any, req.params.username);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({
        ok: false,
        error: (err as any).message ?? 'Unknown error',
      });
    }
  });

  app.get('/:username/rss', async (req, res) => {
    const username = req.params.username;
    const {
      flavour = 'default',
    } = req.query;

    let result;

    try {
      result = await fetchTweets(redis as any, username);
    } catch (err) {
      console.error(err);
      res.status(500).send((err as any).message ?? 'Unknown error');
      return;
    }

    if (!result.ok) {
      res.status(404).send(result.error);
      return;
    }

    const feed = new RSS({
      title: username,
      feed_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      site_url: `https://twitter.com/${username}`,
      custom_namespaces: {
        atom: 'http://www.w3.org/2005/Atom'
      }
    });

    for (const tweet of result.tweets) {
      const id = tweet.rest_id;
      const url = `https://twitter.com/${username}/status/${id}`;
      const date = tweet.legacy.created_at;
      const text = tweet.legacy.full_text;
      const mediaUrls = tweet.legacy.entities.media?.map((media: any) => media.media_url_https) ?? [];

      feed.item({
        title: flavour === 'slack'
          ? url
          : text,
        url: url,
        date,
        custom_elements: [{'sdc:creator': username}],
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
