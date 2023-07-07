import fetch from 'node-fetch';
import { RedisClientType as RedisClient } from 'redis';

// Define endpoints for API calls
const ACCESS_TOKEN_API = 'https://api.twitter.com/oauth2/token?grant_type=client_credentials';
const GUEST_TOKEN_API = 'https://api.twitter.com/1.1/guest/activate.json';

// Define functions for generating dynamic API endpoints
const userIdAPIForUsername = (username: string) => `...`;
const tweetsAPIForUserId = (userId: string) => `...`;

// Twitter API credentials for generating access token
const CLIENT_CREDENTIALS = [
  ['CjulERsDeqhhjSme66ECg', 'IQWdVyqFxghAtURHGeGiWAsmCAGmdW3WmbEx6Hck'],
].map(([username, password]) => Buffer.from(`${username}:${password}`).toString('base64'));

// Function to fetch access token
const fetchAccessToken = async (): Promise<string> => {
  const [credentials] = CLIENT_CREDENTIALS;
  // Request to fetch access token
  const { access_token: accessToken } = await fetch(ACCESS_TOKEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
    },
  }).then((res) => res.json()) as any;

  return accessToken;
};

// Function to fetch guest token
const fetchGuestToken = async (accessToken: string): Promise<string> => {
  // Request to fetch guest token
  const { guest_token: guestToken } = await fetch(GUEST_TOKEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }).then((res) => res.json()) as any;

  return guestToken;
};

// Types for user ID fetch response
type TUserIdExists = { exists: true; userId: string; };
type TUserIdDoesNotExist = { exists: false; };
type TUserIdResult = TUserIdExists | TUserIdDoesNotExist;

// Function to fetch user ID
const fetchUserId = async (username: string, accessToken: string, guestToken: string): Promise<TUserIdResult> => {
  const response = await fetch(userIdAPIForUsername(username), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-guest-token': guestToken,
      'x-twitter-active-user': 'yes',
      'Referer': 'https://twitter.com/',
    },
  }).then((res) => res.json()) as any;

  // Error handling
  if (!response.data) {
    throw new Error(JSON.stringify(response, null, 2));
  }

  if (!response.data.user) {
    return { exists: false };
  }

  return { exists: true, userId: response.data.user.result.rest_id };
};

// Options for caching mechanism
interface WithCacheOptions<T> {
  redis: RedisClient;
  key: string;
  friendlyLabel?: string;
  producer: () => Promise<T>;
  invalidateOnError?: boolean;
}

// Function for cache mechanism
const withCache = async <T, U>({ redis, key, friendlyLabel = key, producer, invalidateOnError = false, }: WithCacheOptions<T>, callback: (value: T) => Promise<U>,): Promise<U> => {
  const cachedJSON: string | null = await redis.get(key);
  const cachedValue: T | null = cachedJSON ? JSON.parse(cachedJSON) : null;

  // Log cache hit/miss
  console.log(`${friendlyLabel}: Cache ${cachedValue ? 'hit' : 'miss'}`);

  // Error handling with caching
  if (cachedValue) {
    try {
      return await callback(cachedValue);
    } catch (err) {
      if (!invalidateOnError) {
        throw err;
      }

      console.log(`${friendlyLabel}: Cached value resulted in error, fetching new value`);
    }
  }

  // Refresh cache if miss
  const value = await producer();
  await redis.set(key, JSON.stringify(value));
  return callback(value);
};

// Types for fetch tweets response
type TFetchTweetsSuccess = { ok: true; tweets: any; };
type TFetchTweetsUserDoesNotExist = { ok: false; error: 'User does not exist'; };
type TFetchTweetsResult = TFetchTweetsSuccess | TFetchTweetsUserDoesNotExist;

// Main function to fetch tweets
export const fetchTweets = async (redis: RedisClient, username: string): Promise<TFetchTweetsResult> => 
  withCache({ // withCache for access token
    redis,
    key: 'access-token',
    friendlyLabel: 'Access token',
    producer: fetchAccessToken,
    invalidateOnError: true,
  }, (accessToken) =>
    withCache({ // withCache for guest token
      redis,
      key: `guest-token-${accessToken}`,
      friendlyLabel: 'Guest token',
      producer: () => fetchGuestToken(accessToken),
      invalidateOnError: true,
    }, async (guestToken) =>
      withCache({ // withCache for user ID
        redis,
        key: `user-id-${username}`,
        friendlyLabel: 'User ID',
        producer: () => fetchUserId(username, accessToken, guestToken),
      }, async (userIdResult) => { // Fetch tweets for user ID
        if (!userIdResult.exists) {
           return { ok: false, error: 'User does not exist' };
        }

        const data = await fetch(tweetsAPIForUserId(userIdResult.userId), {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-guest-token': guestToken,
            'x-twitter-active-user': 'yes',
            'Referer': 'https://twitter.com',
          },
        }).then(res => res.json());

        // Parse and return tweet data
        return {
          ok: true,
          tweets: data.data.user.result.timeline_v2.timeline.instructions
            .filter((instruction: any) => instruction.type === 'TimelineAddEntries')
            .flatMap((instruction: any) => instruction.entries)
            .map((entry: any) => entry?.content?.itemContent?.tweet_results?.result)
            .filter((tweet: any) => tweet)
        };
      }),
    )
  );
