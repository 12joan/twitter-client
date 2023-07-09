import { RedisClientType as RedisClient } from 'redis';
import { withCache } from './withCache';
import {
  getAccessToken,
  fetchGuestToken,
  fetchUserId,
  fetchUserTweets,
} from './twitter-api';

type TFetchTweetsSuccess = {
  ok: true;
  tweets: any;
};

type TFetchTweetsUserDoesNotExist = {
  ok: false;
  error: 'User does not exist';
};

type TFetchTweetsResult = TFetchTweetsSuccess | TFetchTweetsUserDoesNotExist;

export interface GetTweetsForUsernameOptions {
  redis: RedisClient;
  username: string;
}

export const getTweetsForUsername = async ({
  redis,
  username,
}: GetTweetsForUsernameOptions): Promise<TFetchTweetsResult> => {
  const accessToken = getAccessToken();
  return withCache({
    redis,
    key: `guest-token-${accessToken}`,
    friendlyLabel: 'Guest token',
    producer: () => fetchGuestToken({ accessToken }),
    invalidateOnError: true,
  }, async (guestToken) =>
    withCache({
      redis,
      key: `user-id-${username}`,
      friendlyLabel: 'User ID',
      producer: () => fetchUserId({ accessToken, guestToken, username }),
    }, async (userIdResult) => {
      if (!userIdResult.exists) {
         return { ok: false, error: 'User does not exist' };
      };

      const tweets = await fetchUserTweets({
        accessToken,
        guestToken,
        userId: userIdResult.userId,
        username,
      });

      return { ok: true, tweets };
    }),
  );
}
