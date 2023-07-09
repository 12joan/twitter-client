export const getAccessToken = (): string => {
  // pick one randomly, these are prefetched Bearer tokens
  const CLIENT_CREDENTIALS: [string, string][] = [
    [
      'AAAAAAAAAAAAAAAAAAAAACHguwAAAAAAaSlT0G31NDEyg%2BSnBN5JuyKjMCU%3Dlhg0gv0nE7KKyiJNEAojQbn8Y3wJm1xidDK7VnKGBP4ByJwHPb',
      'developer.twitter.com',
    ],
    [
      'AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF',
      'tweetdeck',
    ],
    [
      'AAAAAAAAAAAAAAAAAAAAAGHtAgAAAAAA%2Bx7ILXNILCqkSGIzy6faIHZ9s3Q%3DQy97w6SIrzE7lQwPJEYQBsArEE2fC25caFwRBvAGi456G09vGR',
      'ipad',
    ],
  ];
  const [accessToken, client] =
    CLIENT_CREDENTIALS[Math.floor(Math.random() * CLIENT_CREDENTIALS.length)];
  console.log(`Using credentials: ${client}`);

  return accessToken;
};
