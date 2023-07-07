import fetch from 'node-fetch';
import { RedisClientType as RedisClient } from 'redis';

const ACCESS_TOKEN_API = 'https://api.twitter.com/oauth2/token?grant_type=client_credentials';
const GUEST_TOKEN_API = 'https://api.twitter.com/1.1/guest/activate.json';

const userIdAPIForUsername = (username: string) => `https://api.twitter.com/graphql/oUZZZ8Oddwxs8Cd3iW3UEA/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%2C%22withSafetyModeUserFields%22%3Atrue%7D&features=%7B%22hidden_profile_likes_enabled%22%3Afalse%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D`;

const tweetsAPIForUserId = (userId: string) => `https://api.twitter.com/graphql/pNl8WjKAvaegIoVH--FuoQ/UserTweetsAndReplies?variables=%7B%22userId%22%3A%22${userId}%22,%22count%22%3A40,%22includePromotedContent%22%3Atrue,%22withCommunity%22%3Atrue,%22withSuperFollowsUserFields%22%3Atrue,%22withDownvotePerspective%22%3Afalse,%22withReactionsMetadata%22%3Afalse,%22withReactionsPerspective%22%3Afalse,%22withSuperFollowsTweetFields%22%3Atrue,%22withVoice%22%3Atrue,%22withV2Timeline%22%3Atrue%7D&features=%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue,%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue,%22verified_phone_label_enabled%22%3Afalse,%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue,%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse,%22tweetypie_unmention_optimization_enabled%22%3Atrue,%22vibe_api_enabled%22%3Atrue,%22responsive_web_edit_tweet_api_enabled%22%3Atrue,%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue,%22view_counts_everywhere_api_enabled%22%3Atrue,%22longform_notetweets_consumption_enabled%22%3Atrue,%22tweet_awards_web_tipping_enabled%22%3Afalse,%22freedom_of_speech_not_reach_fetch_enabled%22%3Afalse,%22standardized_nudges_misinfo%22%3Atrue,%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Afalse,%22interactive_text_enabled%22%3Atrue,%22responsive_web_text_conversations_enabled%22%3Afalse,%22longform_notetweets_richtext_consumption_enabled%22%3Afalse,%22responsive_web_enhance_cards_enabled%22%3Afalse%7D`;

const CLIENT_CREDENTIALS: [string, string, string][] = [
  // ['IQKbtAYlXLripLGPWd0HUA', 'GgDYlkSvaPxGxC4X8liwpUoqKwwr3lCADbz8A7ADU', 'iPhone'],
  // ['3nVuSoBZnx6U4vzUxf5w', 'Bcs59EFbbsdF6Sl9Ng71smgStWEGwXXKSjYvPVt7qys', 'Android'],
  ['CjulERsDeqhhjSme66ECg', 'IQWdVyqFxghAtURHGeGiWAsmCAGmdW3WmbEx6Hck', 'iPad'],
  // ['3rJOl1ODzm9yZy63FACdg', '5jPoQ5kQvMJFDYRNE8bQ4rHuds4xJqhvgNJM4awaE8', 'Mac'],
];

const fetchAccessToken = async (): Promise<string> => {
  // pick one randomly
  const [username, password, client] = CLIENT_CREDENTIALS[Math.floor(Math.random() * CLIENT_CREDENTIALS.length)];
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');
  console.log(`Using credentials: ${client}`)

  const { access_token: accessToken } = await fetch(ACCESS_TOKEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
    },
  }).then((res) => res.json()) as any;

  return accessToken;
};

const fetchGuestToken = async (accessToken: string): Promise<string> => {
  const { guest_token: guestToken } = await fetch(GUEST_TOKEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }).then((res) => res.json()) as any;

  return guestToken;
};

type TUserIdExists = {
  exists: true;
  userId: string;
};

type TUserIdDoesNotExist = {
  exists: false;
};

type TUserIdResult = TUserIdExists | TUserIdDoesNotExist;

const fetchUserId = async (
  username: string,
  accessToken: string,
  guestToken: string,
): Promise<TUserIdResult> => {
  const response = await fetch(userIdAPIForUsername(username), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-guest-token': guestToken,
      'x-twitter-active-user': 'yes',
      'Referer': 'https://twitter.com/',
    },
  }).then((res) => res.json()) as any;

  if (!response.data) {
    throw new Error(JSON.stringify(response, null, 2));
  }

  if (!response.data.user) {
    return { exists: false };
  }

  return {
    exists: true,
    userId: response.data.user.result.rest_id,
  };
};

interface WithCacheOptions<T> {
  redis: RedisClient;
  key: string;
  friendlyLabel?: string;
  producer: () => Promise<T>;
  invalidateOnError?: boolean;
}

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

export const fetchTweets = async (redis: RedisClient, username: string): Promise<TFetchTweetsResult> =>
  withCache({
    redis,
    key: 'access-token',
    friendlyLabel: 'Access token',
    producer: fetchAccessToken,
    invalidateOnError: true,
  }, (accessToken) =>
    withCache({
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
        };
      }),
    )
  );
