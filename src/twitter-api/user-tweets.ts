import { TEither } from '../either';
import {
  TUserTweetsResponse,
  TTimelineAddEntriesInstruction,
  TTweet,
} from './api-types';
import { TUserTweetsError } from './error-types';

const tweetsAPIForUserId = (userId: string) =>
  `https://api.twitter.com/graphql/pNl8WjKAvaegIoVH--FuoQ/UserTweetsAndReplies?variables=%7B%22userId%22%3A%22${userId}%22,%22count%22%3A40,%22includePromotedContent%22%3Atrue,%22withCommunity%22%3Atrue,%22withSuperFollowsUserFields%22%3Atrue,%22withDownvotePerspective%22%3Afalse,%22withReactionsMetadata%22%3Afalse,%22withReactionsPerspective%22%3Afalse,%22withSuperFollowsTweetFields%22%3Atrue,%22withVoice%22%3Atrue,%22withV2Timeline%22%3Atrue%7D&features=%7B%22responsive_web_twitter_blue_verified_badge_is_enabled%22%3Atrue,%22responsive_web_graphql_exclude_directive_enabled%22%3Atrue,%22verified_phone_label_enabled%22%3Afalse,%22responsive_web_graphql_timeline_navigation_enabled%22%3Atrue,%22responsive_web_graphql_skip_user_profile_image_extensions_enabled%22%3Afalse,%22tweetypie_unmention_optimization_enabled%22%3Atrue,%22vibe_api_enabled%22%3Atrue,%22responsive_web_edit_tweet_api_enabled%22%3Atrue,%22graphql_is_translatable_rweb_tweet_is_translatable_enabled%22%3Atrue,%22view_counts_everywhere_api_enabled%22%3Atrue,%22longform_notetweets_consumption_enabled%22%3Atrue,%22tweet_awards_web_tipping_enabled%22%3Afalse,%22freedom_of_speech_not_reach_fetch_enabled%22%3Afalse,%22standardized_nudges_misinfo%22%3Atrue,%22tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled%22%3Afalse,%22interactive_text_enabled%22%3Atrue,%22responsive_web_text_conversations_enabled%22%3Afalse,%22longform_notetweets_richtext_consumption_enabled%22%3Afalse,%22responsive_web_enhance_cards_enabled%22%3Afalse%7D`;

export interface FetchUserTweetsOptions {
  accessToken: string;
  guestToken: string;
  userId: string;
  username: string; // Used for filtering Tweets
}

export const fetchUserTweets = async ({
  accessToken,
  guestToken,
  userId,
  username,
}: FetchUserTweetsOptions): Promise<TEither<TTweet[], TUserTweetsError>> => {
  let data: TUserTweetsResponse;

  try {
    data = await fetch(tweetsAPIForUserId(userId), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-guest-token': guestToken,
        'x-twitter-active-user': 'yes',
        Referer: 'https://twitter.com',
      },
    }).then((res) => res.json());
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'user-tweets-unknown-error' };
  }

  const addEntriesInstructions =
    data.data.user.result.timeline_v2.timeline.instructions.filter(
      (instruction) => instruction.type === 'TimelineAddEntries'
    ) as TTimelineAddEntriesInstruction[];

  const tweets = addEntriesInstructions
    .flatMap((instruction) => instruction.entries)
    .map((entry) => entry?.content?.itemContent?.tweet_results?.result)
    .filter((tweet) => tweet) as TTweet[];

  /**
   * Only accept Tweets whose screen_name matches username. It may be
   * a bug or it may be advertising, but incorrect Tweets have been
   * showing up on this API endpoint.
   */
  const filteredTweets = tweets.filter(
    (tweet) =>
      tweet.core.user_results.result.legacy.screen_name.toUpperCase() ===
      username.toUpperCase()
  );

  return { ok: true, data: filteredTweets };
};
