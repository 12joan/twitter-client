const userIdAPIForUsername = (username: string) => `https://api.twitter.com/graphql/oUZZZ8Oddwxs8Cd3iW3UEA/UserByScreenName?variables=%7B%22screen_name%22%3A%22${username}%22%2C%22withSafetyModeUserFields%22%3Atrue%7D&features=%7B%22hidden_profile_likes_enabled%22%3Afalse%2C%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue%2C%22verified_phone_label_enabled%22%3Afalse%2C%22subscriptions_verification_info_verified_since_enabled%22%3Atrue%2C%22highlights_tweets_tab_ui_enabled%22%3Atrue%2C%22creator_subscriptions_tweet_preview_api_enabled%22%3Atrue%2C%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse%2C%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue%7D`;

type TUserIdExists = {
  exists: true;
  userId: string;
};

export type TUserIdDoesNotExist = {
  exists: false;
};

export type TUserIdResult = TUserIdExists | TUserIdDoesNotExist;

export interface FetchUserIdOptions {
  accessToken: string;
  guestToken: string;
  username: string;
}

export const fetchUserId = async ({
  accessToken,
  guestToken,
  username,
}: FetchUserIdOptions): Promise<TUserIdResult> => {
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
