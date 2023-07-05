import express from 'express';
import { createClient as createRedisClient } from 'redis';
import RSS from 'rss';
import { fetchTweets } from './twitter';
import fs from 'fs';

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
      eval(fs.readFileSync('./src/feed_item_' + flavour + '.ts', 'utf-8'));
    }

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());
  });

  app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
  });
});
