import RSS from 'rss';
import { TTweet } from './twitter-api';

export const RSS_FLAVOURS = ['default', 'slack'] as const;
export type TRSSFlavour = (typeof RSS_FLAVOURS)[number];

export interface CreateUserRSSFeedOptions {
  username: string;
  feedUrl: string;
  tweets: TTweet[];
  flavour?: TRSSFlavour;
}

export const createUserRSSFeed = ({
  username,
  feedUrl,
  tweets,
  flavour = 'default',
}: CreateUserRSSFeedOptions): RSS => {
  // Feed metadata
  const feed = new RSS({
    title: username,
    feed_url: feedUrl,
    site_url: `https://twitter.com/${username}`,
    custom_namespaces: {
      atom: 'http://www.w3.org/2005/Atom',
    },
  });

  // For each tweet, add an item to the feed
  for (const tweet of tweets) {
    const id = tweet.rest_id;
    const url = `https://twitter.com/${username}/status/${id}`;
    const date = tweet.legacy.created_at;
    const text = tweet.legacy.full_text;
    const mediaUrls =
      tweet.legacy.entities.media?.map((media) => media.media_url_https) ?? [];

    feed.item({
      title: flavour === 'slack' ? url : text,
      url: url,
      date,
      custom_elements: [{ 'dc:creator': username }],
      description: [
        text,
        ...mediaUrls.map((url: string) =>
          flavour === 'slack' ? url : `<img src="${url}" />`
        ),
      ].join('\n'),
    });
  }

  return feed;
};
