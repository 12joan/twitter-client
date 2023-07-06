// Import required modules
// Express for handling HTTP requests
import express from 'express';
// Redis for caching data
import { createClient as createRedisClient } from 'redis';
// RSS for generating RSS feeds
import RSS from 'rss';
// fetchTweets for getting tweets from a given user
import { fetchTweets } from './twitter';

// Initialize a Redis client with a URL from environment variables
const redis = createRedisClient({ url: process.env.REDIS_URL });

// Attach an error event listener to the Redis client
// It logs any error that occurs while interacting with the Redis server
redis.on('error', console.error);

// Connect to the Redis server
// This is an asynchronous operation that returns a promise
redis.connect().then(() => {
  // Instantiate an Express application
  // Express is a minimal and flexible Node.js web application framework
  const app = express();

  // Define the host and port on which the Express server will listen
  // The values are taken from environment variables or defaults
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || 'localhost';

  // Define a route handler for GET requests made to the path '/:username'
  // This handler fetches the tweets of the user specified in the path parameter 'username'
  app.get('/:username', async (req, res) => {
    try {
      // Attempt to fetch tweets for the username
      const result = await fetchTweets(redis as any, req.params.username);
      // Send the result as the HTTP response in JSON format
      res.json(result);
    } catch (err) {
      // Log the error and send a 500 Internal Server Error status code
      console.error(err);
      res.status(500).json({
        ok: false,
        error: (err as any).message ?? 'Unknown error',
      });
    }
  });

  // Define a route handler for GET requests made to the path '/:username/rss'
  // This handler fetches the tweets of the user specified in the path parameter 'username'
  // and returns the tweets in RSS format
  app.get('/:username/rss', async (req, res) => {
    const username = req.params.username;
    const { flavour = 'default' } = req.query;
    let result;

    try {
      // Attempt to fetch tweets for the username
      result = await fetchTweets(redis as any, username);
    } catch (err) {
      // Log the error and send a 500 Internal Server Error status code
      console.error(err);
      res.status(500).send((err as any).message ?? 'Unknown error');
      return;
    }

    // If fetching the tweets failed, send the error message as the HTTP response
    if (!result.ok) {
      res.status(404).send(result.error);
      return;
    }

    // Create a new RSS feed for the tweets
    const feed = new RSS({
      title: username,
      feed_url: req.protocol + '://' + req.get('host') + req.originalUrl,
      site_url: `https://twitter.com/${username}`,
      custom_namespaces: {
        atom: 'http://www.w3.org/2005/Atom'
      }
    });

    // Add each tweet to the RSS feed
    for (const tweet of result.tweets) {
      const id = tweet.rest_id;
      const url = `https://twitter.com/${username}/status/${id}`;
      const date = tweet.legacy.created_at;
      const text = tweet.legacy.full_text;
      const mediaUrls = tweet.legacy.entities.media?.map((media: any) => media.media_url_https) ?? [];

      // Define each item in the RSS feed
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

    // Set the Content-Type of the response to 'application/rss+xml'
    // This informs clients that the response contains an RSS feed
    res.set('Content-Type', 'application/rss+xml');
    // Send the RSS feed as the HTTP response
    res.send(feed.xml());
  });

  // Start the Express server on the specified host and port
  // This is an asynchronous operation that will log a message when the server is ready
  app.listen(port, host, () => {
    console.log(`Server listening at http://${host}:${port}`);
  });
});
