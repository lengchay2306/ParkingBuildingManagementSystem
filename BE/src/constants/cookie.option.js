export const commonCookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: "/"
}

export const COOKIE_EXPIRED_ACCESS_TOKEN_TIME = 15 * 60 * 1000

export const COOKIE_EXPIRED_REFRESH_TOKEN_TIME = 7 * 24 * 60 * 60 * 1000