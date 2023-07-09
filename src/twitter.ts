import { TEither } from './either';
import { RedisClientType as RedisClient } from 'redis';
import { withCache } from './withCache';
import {
  getAccessToken,
  fetchGuestToken,
  fetchUserId,
  fetchUserTweets,
  TTweet,
  TGuestTokenError,
  TUserIdError,
  TUserTweetsError,
} from './twitter-api';

export type TGetTweetsForUsernameError =
  | TGuestTokenError
  | TUserIdError
  | TUserTweetsError;

export interface GetTweetsForUsernameOptions {
  redis: RedisClient;
  username: string;
}

export const getTweetsForUsername = async ({
  redis,
  username,
}: GetTweetsForUsernameOptions): Promise<TEither<TTweet[], TGetTweetsForUsernameError>> => {
  const accessToken = getAccessToken();

  return withCache({
    redis,
    key: `guest-token-${accessToken}`,
    friendlyLabel: 'Guest token',
    producer: () => fetchGuestToken({ accessToken }),
    invalidateOnError: true,
    shouldInvalidateOnResult: ({ ok }) => !ok,
  }, async (guestTokenResult) => {
    if (!guestTokenResult.ok) {
      return guestTokenResult;
    }

    const guestToken = guestTokenResult.data;

    return withCache({
      redis,
      key: `user-id-${username}`,
      friendlyLabel: 'User ID',
      producer: () => fetchUserId({ accessToken, guestToken, username }),
    }, async (userIdResult) => {
      if (!userIdResult.ok) {
        return userIdResult;
      };

      const userId = userIdResult.data;

      return fetchUserTweets({
        accessToken,
        guestToken,
        userId,
        username,
      });
    });
  });
};
