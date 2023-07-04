import express from 'express';
import { createClient as createRedisClient } from 'redis';
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

  app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
  });
});
