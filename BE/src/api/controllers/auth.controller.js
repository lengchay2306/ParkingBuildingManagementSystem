import {
    commonCookieOption, 
    COOKIE_EXPIRED_ACCESS_TOKEN_TIME, 
    COOKIE_EXPIRED_REFRESH_TOKEN_TIME 
} from "../../constants/cookie.option.js"

class AuthController {
    #authService
    constructor({
        authService,
    }) {
        this.#authService = authService
    }


    login = async (req, res, next) => {
        try {
            const { email, password } = req.body
    
            const { deviceName } = req.device
    
            const { accessToken, refreshToken } = await this.#authService.login({
                email: email,
                password: password,
                deviceName: deviceName,
            });
    
            res.cookie("accessToken", accessToken, {
                ...commonCookieOption,
                maxAge: COOKIE_EXPIRED_ACCESS_TOKEN_TIME,
            })

            res.cookie('refreshToken', refreshToken, {
                ...commonCookieOption,
                maxAge: COOKIE_EXPIRED_REFRESH_TOKEN_TIME
            })

            res.status(201).json({
                status: 'success',
                data: {
                    message: "login successfully"
                }
            })
        } catch (error) {
            next(error);
        }
    }

    refreshToken = async (req, res, next) => {
        try {
            const oldRefreshToken = req.cookies.refreshToken

            if (!oldRefreshToken) {
                return res.status(400).json({
                    status: 'fail',
                    data: {
                        message: "missing token from cookie"
                    }
                })
            }

            const { deviceName } = req.device

            const { accessToken, refreshToken } = await this.#authService.refreshToken({
                oldRefreshToken,
                deviceName,
            })
            res.cookie("accessToken", accessToken, {
                ...commonCookieOption,
                maxAge: COOKIE_EXPIRED_ACCESS_TOKEN_TIME,
            })

            res.cookie('refreshToken', refreshToken, {
                ...commonCookieOption,
                maxAge: COOKIE_EXPIRED_REFRESH_TOKEN_TIME
            })

            res.status(201).json({
                status: 'success',
                data: {
                    message: "refresh token successfully"
                }
            })
        } catch (error) {
            next(error)
        }
    }

    logout = async (req, res, next) => {
        try {
            const { userId, deviceId } = req.user
    
            const isDeleted = await this.#authService.logout({
                userId: userId,
                deviceId: deviceId,
            });

            if (!isDeleted) {
                return res.status(400).json({
                    status: 'fail',
                    data: {
                        message: "logout failed!"
                    }
                })
            }

            res.clearCookie('accessToken', { commonCookieOption })
            res.clearCookie('refreshToken', { commonCookieOption })

            res.status(200).json({
                status: 'success',
                data: {
                    message: 'logout successfully'
                }
            })
        } catch (error) {
            next(error);
        }
    }

    register = async (req, res, next) => {
        const {
            email,
            password,
            fullName,
            phone,
        } = req.body

        const newUser = await this.#authService.register({
            email: email,
            password: password,
            fullName: fullName,
            phone: phone,
        })

        res.status(201).json({
            status: 'success',
            data: {
                user: newUser,
                vehicle: {
                    
                }
            }
        })
    }
}

export default AuthController