import express from 'express';
import { fetchTweets } from './twitter';

const app = express();

const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || 'localhost';

app.get('/:username', async (req, res) => {
  try {
    const tweets = await fetchTweets(req.params.username);
    res.json({
      ok: true,
      tweets,
    });
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
