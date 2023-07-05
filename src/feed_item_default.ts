const id = tweet.rest_id;
const url = `https://twitter.com/${username}/status/${id}`;
const date = tweet.legacy.created_at;
const text = tweet.legacy.full_text;
const mediaUrls = tweet.legacy.entities.media?.map((media) => media.media_url_https) ?? [];

feed.item({
    title: text,
    url: url,
    date,
    description: [
	text,
        ...mediaUrls.map((url) => `<img src="${url}" />`),
    ].join('\n'),
});
