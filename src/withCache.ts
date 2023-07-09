import { RedisClientType as RedisClient } from 'redis';

export interface WithCacheOptions<T> {
  redis: RedisClient;
  key: string;
  friendlyLabel?: string;
  producer: () => Promise<T>;
  invalidateOnError?: boolean;
}

export const withCache = async <T, U>(
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
