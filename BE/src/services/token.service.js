import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { AuthenticationError } from '../error/error.js';
import { configDotenv } from 'dotenv';
configDotenv()

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET

class TokenService {
    #refreshTokenRepository
    constructor({
        refreshTokenRepository
    }) {
        this.#refreshTokenRepository = refreshTokenRepository
    }

    generateToken = ({
        userId,
        fullName,
        roleId,
        roleName,
        deviceId,
    }) => {
        const finalDeviceId = deviceId || 
                                `DEVICE_${crypto.randomUUID().split('-')[0].toUpperCase()}`;

        const accessToken = jwt.sign(
            { userId, fullName, roleId, roleName, deviceId: finalDeviceId},
            JWT_SECRET,
            { expiresIn: "15m"}
        )

        const refreshToken = jwt.sign(
            { userId, deviceId: finalDeviceId, fullName },
            REFRESH_JWT_SECRET,
            { expiresIn: '7d'}
        )

        return {
            accessToken,
            refreshToken,
            deviceId: finalDeviceId,
        }
    }

    saveRefreshToken = async ({
        userId,
        refreshToken,
        deviceId,
        deviceName,
    }) => {
        return await this.#refreshTokenRepository.saveRefreshToken({
            userId: userId,
            refreshToken: refreshToken,
            deviceId: deviceId,
            deviceName: deviceName,
        });
    }

    verifyAccessToken = async ({
        token
    }) => {
        const decode = jwt.decode(token, JWT_SECRET);
        return decode
    }

    verifyRefreshToken = async ({
        token,
    }) => {
        const decode = jwt.decode(token, REFRESH_JWT_SECRET);

        const tokenInDb = await this.#refreshTokenRepository.findRefreshToken({
            userId: decode.userId,
            deviceId: decode.deviceId,
            refreshToken: token,
        })

        if (!tokenInDb) {
            throw new AuthenticationError(`Token expired!`)
        }

        return decode
    }

    revokeRefreshToken = async ({
        userId,
        deviceId,
    }) => {
        return await this.#refreshTokenRepository.deleteRefreshToken({
            userId: userId,
            deviceId: deviceId,
        })
    }
}

export default TokenService