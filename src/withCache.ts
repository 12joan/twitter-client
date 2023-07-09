import { RedisClientType as RedisClient } from 'redis';

// Update this to invalidate the cache for all instances
const GLOBAL_CACHE_PREFIX = 'v2:';

export interface WithCacheOptions<T, U> {
  redis: RedisClient;
  key: string;
  friendlyLabel?: string;
  producer: () => Promise<T>;
  invalidateOnError?: boolean;
  shouldInvalidateOnResult?: (result: U) => boolean;
}

export const withCache = async <T, U>(
  {
    redis,
    key,
    friendlyLabel = key,
    producer,
    invalidateOnError = false,
    shouldInvalidateOnResult = () => false,
  }: WithCacheOptions<T, U>,
  callback: (value: T) => Promise<U>
): Promise<U> => {
  const prefixedKey = GLOBAL_CACHE_PREFIX + key;

  const cachedJSON: string | null = await redis.get(prefixedKey);
  const cachedValue: T | null = cachedJSON ? JSON.parse(cachedJSON) : null;

  console.log(`${friendlyLabel}: Cache ${cachedValue ? 'hit' : 'miss'}`);

  if (cachedValue) {
    let result: U | undefined = undefined;

    try {
      result = await callback(cachedValue);
    } catch (err) {
      if (!invalidateOnError) {
        throw err;
      }

      console.log(
        `${friendlyLabel}: Cached value resulted in error, fetching new value`
      );
    }

    if (result) {
      if (shouldInvalidateOnResult(result)) {
        console.log(
          `${friendlyLabel}: Cached value resulted in an invalid result, fetching new value`
        );
      } else {
        return result;
      }
    }
  }

  const value = await producer();
  await redis.set(prefixedKey, JSON.stringify(value));
  return callback(value);
};
