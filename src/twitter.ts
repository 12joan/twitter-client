import fetch from 'node-fetch';
import { RedisClientType as RedisClient } from 'redis';

// A constant containing the URL of the Twitter API endpoint for activating a guest token.
const GUEST_TOKEN_API = 'https://api.twitter.com/1.1/guest/activate.json';

// A function for fetching user ID by username.
const userIdAPIForUsername = (username: string) => `https://api.twitter.com/graphql/oUZZZ8Oddwxs8Cd3iW3UEA/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%2C%22withSafetyModeUserFields%22%3Atrue%7D&features=%7B%22hidden_profile_likes_enabled%22%3Afalse%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D`;

// A function for fetching tweets and replies by user ID.
const tweetsAPIForUserId = (userId: string) => `https://api.twitter.com/graphql/pNl8WjKAvaegIoVH--FuoQ/UserTweetsAndReplies?variables=%7B%22userId%22%3A%22${userId}%22,%22count%22%3A40,%22includePromotedContent%22%3Atrue,%22withCommunity%22%3Atrue,%22withSuperFollowsUserFields%22%3Atrue,%22withDownvotePerspective%22%3Afalse,%22withReactionsMetadata%22%3Afalse,%22withReactionsPerspective%22%3Afalse,%22withSuperFollowsTweetFields%22%3Atrue,%22withVoice%22%3Atrue,%22withV2Timeline%22%3Atrue%7D&features=%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue,%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue,%22verified_phone_label_enabled%22%3Afalse,%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue,%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse,%22tweetypie_unmention_optimization_enabled%22%3Atrue,%22vibe_api_enabled%22%3Atrue,%22responsive_web_edit_tweet_api_enabled%22%3Atrue,%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue,%22view_counts_everywhere_api_enabled%22%3Atrue,%22longform_notetweets_consumption_enabled%22%3Atrue,%22tweet_awards_web_tipping_enabled%22%3Afalse,%22freedom_of_speech_not_reach_fetch_enabled%22%3Afalse,%22standardized_nudges_misinfo%22%3Atrue,%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Afalse,%22interactive_text_enabled%22%3Atrue,%22responsive_web_text_conversations_enabled%22%3Afalse,%22longform_notetweets_richtext_consumption_enabled%22%3Afalse,%22responsive_web_enhance_cards_enabled%22%3Afalse%7D`;

// A function that randomly selects an access token from an array of prefetched Bearer tokens.
const getAccessToken = (): string => {
  // pick one randomly, these are prefetched Bearer tokens
  const CLIENT_CREDENTIALS: [string, string][] = [
    ['AAAAAAAAAAAAAAAAAAAAACHguwAAAAAAaSlT0G31NDEyg%2BSnBN5JuyKjMCU%3Dlhg0gv0nE7KKyiJNEAojQbn8Y3wJm1xidDK7VnKGBP4ByJwHPb', 'developer.twitter.com'],
    ['AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF', 'tweetdeck'],
    ['AAAAAAAAAAAAAAAAAAAAAGHtAgAAAAAA%2Bx7ILXNILCqkSGIzy6faIHZ9s3Q%3DQy97w6SIrzE7lQwPJEYQBsArEE2fC25caFwRBvAGi456G09vGR', 'ipad'],
  ];
  const [accessToken, client] = CLIENT_CREDENTIALS[Math.floor(Math.random() * CLIENT_CREDENTIALS.length)];
  console.log(`Using credentials: ${client}`);

  return accessToken;
};


// Async function to fetch a guest token using a provided access token.
const fetchGuestToken = async (accessToken: string): Promise<string> => {
  // Send a POST request to Twitter's guest token API endpoint with the necessary authorization header.
  const { guest_token: guestToken } = await fetch(GUEST_TOKEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }).then((res) => res.json()) as any;

  return guestToken;
};

// Type definition for the situation where a User ID exists, with the boolean flag 'exists' and the user's ID.
type TUserIdExists = {
  exists: true;
  userId: string;
};

// Type definition for the situation where a User ID doesn't exist, only having the boolean flag 'exists'.
type TUserIdDoesNotExist = {
  exists: false;
};

// Definition of a type that can be either TUserIdExists or TUserIdDoesNotExist.
type TUserIdResult = TUserIdExists | TUserIdDoesNotExist;

// Asynchronous function that fetches a user's ID based on their username, using an access token and guest token.
const fetchUserId = async (
  username: string,
  accessToken: string,
  guestToken: string,
): Promise<TUserIdResult> => {
  // Send a GET request to Twitter's User ID API endpoint with the necessary headers.
  const response = await fetch(userIdAPIForUsername(username), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-guest-token': guestToken,
      'x-twitter-active-user': 'yes',
      'Referer': 'https://twitter.com/',
    },
  }).then((res) => res.json()) as any;

  // If the response data is missing, throw an error with the response details.
  if (!response.data) {
    throw new Error(JSON.stringify(response, null, 2));
  }

  // If the user field is missing from the response data, return an object indicating the user doesn't exist.
  if (!response.data.user) {
    return { exists: false };
  }

  // If the user field exists, return an object indicating the user does exist and includes the user's ID.
  return {
    exists: true,
    userId: response.data.user.result.rest_id,
  };
};


// Defines an interface for caching options
interface WithCacheOptions<T> {
  redis: RedisClient;
  key: string;
  friendlyLabel?: string;
  producer: () => Promise<T>;
  invalidateOnError?: boolean;
}

// A higher-order function that handles caching of data using a Redis client
const withCache = async <T, U>(
  {
    redis,
    key,
    friendlyLabel = key,
    producer,
    invalidateOnError = false,
  }: WithCacheOptions<T>,
  callback: (value: T) => Promise<U>,
): Promise<U> => {
  const cachedJSON: string | null = await redis.get(key);
  const cachedValue: T | null = cachedJSON ? JSON.parse(cachedJSON) : null;

  console.log(`${friendlyLabel}: Cache ${cachedValue ? 'hit' : 'miss'}`);

  /**
   * If a cached value exists, attempt the callback with the cached value.
   * Fall through if the cached value does not exist, or if the callback
   * encounters an error and invalidateOnError is true.
   */
  if (cachedValue) {
    try {
      return await callback(cachedValue);
    } catch (err) {
      // If cache is not invalidated on error, throw the error
      if (!invalidateOnError) {
        throw err;
      }

      console.log(`${friendlyLabel}: Cached value resulted in error, fetching new value`);
    }
  }
  // Refresh cache and retry callback
  const value = await producer();
  await redis.set(key, JSON.stringify(value));
  return callback(value);
};

type TFetchTweetsSuccess = {
  ok: true;
  tweets: any;
};

type TFetchTweetsUserDoesNotExist = {
  ok: false;
  error: 'User does not exist';
};

type TFetchTweetsResult = TFetchTweetsSuccess | TFetchTweetsUserDoesNotExist;

export const fetchTweets = async (redis: RedisClient, username: string): Promise<TFetchTweetsResult> => {
  const accessToken = getAccessToken();
  return withCache({
    redis,
    key: `guest-token-${accessToken}`,
    friendlyLabel: 'Guest token',
    producer: () => fetchGuestToken(accessToken),
    invalidateOnError: true,
  }, async (guestToken) =>
    withCache({
      redis,
      key: `user-id-${username}`,
      friendlyLabel: 'User ID',
      producer: () => fetchUserId(username, accessToken, guestToken),
    }, async (userIdResult) => {
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

      return {
        ok: true,
        tweets: data.data.user.result.timeline_v2.timeline.instructions
          .filter((instruction: any) => instruction.type === 'TimelineAddEntries') 
          .flatMap((instruction: any) => instruction.entries)
          .map((entry: any) => entry?.content?.itemContent?.tweet_results?.result)
          .filter((tweet: any) => tweet) 
          /**
           * Only accept Tweets whose screen_name matches username. It may be
           * a bug or it may be advertising, but incorrect Tweets have been
           * showing up on this API endpoint.
           */
          .filter((tweet: any) => tweet.core.user_results.result.legacy.screen_name === username) 
      };
    }),
  )
};
