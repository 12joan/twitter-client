// Types in this file are incomplete

// Guest token
export type TGuestTokenResponse = {
  guest_token: string;
};

// User ID
export type TUserIdExistsResponse = {
  data: {
    user: {
      result: {
        rest_id: string;
      };
    };
  };
};

export type TUserIdDoesNotExistResponse = {
  data: Record<string, never>;
};

export type TUserIdResponse =
  | TUserIdExistsResponse
  | TUserIdDoesNotExistResponse;

// User tweets
export type TTweet = {
  rest_id: string;
  core: {
    user_results: {
      result: {
        legacy: {
          screen_name: string;
        };
      };
    };
  };
  legacy: {
    created_at: string;
    full_text: string;
    entities: {
      media?: {
        media_url_https: string;
      }[];
    };
  };
};

export type TTimelineAddEntriesInstruction = {
  type: 'TimelineAddEntries';
  entries: {
    content?: {
      itemContent?: {
        tweet_results?: {
          result?: TTweet;
        };
      };
    };
  }[];
};

export type TTimelineInstruction =
  | TTimelineAddEntriesInstruction
  | { type: 'never' }; // TypeScript hack

export type TUserTweetsResponse = {
  data: {
    user: {
      result: {
        timeline_v2: {
          timeline: {
            instructions: TTimelineInstruction[];
          };
        };
      };
    };
  };
};
