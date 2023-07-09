export type TGuestTokenUnknownError = 'guest-token-unknown-error';
export type TGuestTokenError = TGuestTokenUnknownError;

export type TUserIdUnknownError = 'user-id-unknown-error';
export type TUserIdDoesNotExistError = 'user-id-does-not-exist-error';
export type TUserIdError = TUserIdUnknownError | TUserIdDoesNotExistError;

export type TUserTweetsUnknownError = 'user-tweets-unknown-error';
export type TUserTweetsError = TUserTweetsUnknownError;
