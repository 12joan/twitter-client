# 12joan/twitter-client

A temporary Twitter client for fetching recent tweets for use while Twitter is closed to guest users.

Based on [this script](https://github.com/zedeus/nitter/issues/919#issuecomment-1619263153) by [polkaulfield](https://github.com/polkaulfield).

## Deployment with Docker

Create a file `docker-compose.yml` with the following content:

```yml
version: '3'

services:
  web:
    image: ghcr.io/12joan/twitter-client:production
    environment:
      REDIS_URL: redis://redis:6379
      HOST: '0.0.0.0'
    ports:
      - 3000:3000
    depends_on:
      - redis

  redis:
    image: redis:latest
```

Start using `docker-compose up -d` and access at http://localhost:3000/.

## Deployment without Docker

- [Red Hat Enterprise Linux](https://github.com/12joan/twitter-client/wiki/Install:NoDocker:Rocky-Linux-8.6)

## Running locally

```
$ yarn install # See https://github.com/12joan/twitter-client/issues/6
$ docker-compose up --build
```

## Usage

### Raw JSON data

You can fetch recent Tweets as JSON from `http://localhost:3000/:username`.

Example: `https://localhost:3000/amnesty`

### RSS feed

To format the results as an RSS feed, use `http://localhost:3000/:username/rss`.

Optionally, specify a preset "flavour" of RSS using `http://localhost:3000/:username/rss?flavour=slack`. Supported flavours:

- `default`
  - Title: Tweet text
  - Description: Tweet text + media URLs as image tags
- `slack`
  - Title: Tweet URL
  - Description: Tweet text + media URLs as links
