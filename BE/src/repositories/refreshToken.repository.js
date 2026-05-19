const REFRESH_TOKEN_EXPIRED_TIME = 7 * 24 * 60 * 60

class RefreshTokenRepository {
    #redis
    constructor({
        redis
    }) {
        this.#redis = redis
    }


    saveRefreshToken = async ({
        userId,
        refreshToken,
        deviceId,
        deviceName,
        expiredIn = REFRESH_TOKEN_EXPIRED_TIME,
    }) => {
        try {
            //setup key
            const tokenKey = `refresh_token:${userId}:${deviceId}`
            const userDeviceKey = `user_devices:${userId}`

            //set to redis
            await Promise.all([
                this.#redis.hset(
                    tokenKey,
                    {
                        refreshToken: refreshToken,
                        name: deviceName,
                        deviceId: deviceId,
                        lastActive: new Date().toLocaleString('vi-VN')
                    }
                ),

                this.#redis.sadd(
                    userDeviceKey,
                    deviceId,
                ),

                this.#redis.expire(tokenKey, expiredIn),
                this.#redis.expire(userDeviceKey, expiredIn)
            ]);

            return true
        } catch (error) {
            console.log(`Cannot save refresh token: ${error}`);
            throw error
        }
    }

    findRefreshToken = async ({
        userId,
        deviceId,
        refreshToken
    }) => {
        try {
            const key = `refresh_token:${userId}:${deviceId}`
    
            const storedRefreshToken = await this.#redis.hget(key, "refreshToken")
            if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
                return null
            }

            return {
                refreshToken: storedRefreshToken,
            }
        } catch (error) {
            console.log(`Cannot find refresh token: ${error}`);
            throw error
        }
    }

    deleteRefreshToken = async ({
        userId,
        deviceId,
    }) => {
        try {
            const tokenKey = `refresh_token:${userId}:${deviceId}`
            const userDeviceKey = `user_devices:${userId}`

            const [deleteResult, removeResult] = await Promise.all([
                this.#redis.del(tokenKey),
                this.#redis.srem(userDeviceKey, deviceId)
            ]) ;

            return deleteResult> 0 ||  removeResult > 0;
        } catch (error) {
            console.log(`Cannot delete refresh token: ${error}`);
            throw error
        }
    }
}

export default RefreshTokenRepository