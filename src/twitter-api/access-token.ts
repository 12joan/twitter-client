// These are pre-fetched bearer tokens
const clientCredentials = {
  'developer.twitter.com':
    'AAAAAAAAAAAAAAAAAAAAACHguwAAAAAAaSlT0G31NDEyg%2BSnBN5JuyKjMCU%3Dlhg0gv0nE7KKyiJNEAojQbn8Y3wJm1xidDK7VnKGBP4ByJwHPb',
  tweetdeck:
    'AAAAAAAAAAAAAAAAAAAAAFQODgEAAAAAVHTp76lzh3rFzcHbmHVvQxYYpTw%3DckAlMINMjmCwxUcaXbAN4XqJVdgMJaHqNOFgPMK0zN1qLqLQCF',
  ipad: 'AAAAAAAAAAAAAAAAAAAAAGHtAgAAAAAA%2Bx7ILXNILCqkSGIzy6faIHZ9s3Q%3DQy97w6SIrzE7lQwPJEYQBsArEE2fC25caFwRBvAGi456G09vGR',
};

const clientCredentialIds = Object.keys(
  clientCredentials
) as (keyof typeof clientCredentials)[];

export const getAccessToken = (): string => {
  const client =
    clientCredentialIds[Math.floor(Math.random() * clientCredentialIds.length)];
  console.log(`Using credentials: ${client}`);
  return clientCredentials[client];
};
