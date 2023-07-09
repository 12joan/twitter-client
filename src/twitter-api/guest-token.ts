import { TEither } from '../either';
import { TGuestTokenResponse } from './api-types';
import { TGuestTokenError } from './error-types';

const GUEST_TOKEN_API = 'https://api.twitter.com/1.1/guest/activate.json';

export interface FetchGuestTokenOptions {
  accessToken: string;
}

export const fetchGuestToken = async ({
  accessToken,
}: FetchGuestTokenOptions): Promise<TEither<string, TGuestTokenError>> => {
  try {
    const { guest_token: guestToken } = (await fetch(GUEST_TOKEN_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((res) => res.json())) as TGuestTokenResponse;

    return { ok: true, data: guestToken };
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'guest-token-unknown-error' };
  }
};
