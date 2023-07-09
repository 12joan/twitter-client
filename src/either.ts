export type TEitherSuccess<S> = { ok: true; data: S };
export type TEitherFailure<F> = { ok: false; error: F };
export type TEither<S, E> = TEitherSuccess<S> | TEitherFailure<E>;
