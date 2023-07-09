const GUEST_TOKEN_API = 'https://api.twitter.com/1.1/guest/activate.json';

export interface FetchGuestTokenOptions {
  accessToken: string;
}

export const fetchGuestToken = async ({
  accessToken,
}: FetchGuestTokenOptions): Promise<string> => {
  const { guest_token: guestToken } = await fetch(GUEST_TOKEN_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }).then((res) => res.json()) as any;

  return guestToken;
};
