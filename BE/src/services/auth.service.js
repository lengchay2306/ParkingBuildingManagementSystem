import { AuthenticationError, BadRequestError } from "../error/error.js";
import crypto from 'crypto';

class AuthService {
    #userRepository;
    #tokenService;
    #hashService;
    #roleRepository
    #passwordResetTokenRepository;
    #sendgridClient;
    constructor({
        userRepository,
        tokenService,
        hashService,
        roleRepository,
        passwordResetTokenRepository,
        sendgridClient,
    }) {
        this.#userRepository = userRepository;
        this.#tokenService = tokenService;
        this.#hashService = hashService;
        this.#roleRepository = roleRepository
        this.#passwordResetTokenRepository = passwordResetTokenRepository;
        this.#sendgridClient = sendgridClient;
    }

    login = async ({
        email,
        password,
        deviceName,
    }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await this.#userRepository.findUserByEmail({
            email: normalizedEmail,
        });

        if (!existingUser) {
            throw new BadRequestError(`This email doesn't exits!`);
        }

        if (existingUser.status === 'LOCKED') {
            throw new BadRequestError(`This account is banned!`)
        }

        const isMatchedPassword = await this.#hashService.compare({
            string: password,
            hashed: existingUser.password
        });

        if (!isMatchedPassword) {
            throw new AuthenticationError(`Invalid Password!`);
        }

        const {
            accessToken,
            refreshToken,
            deviceId,
        } = await this.#tokenService.generateToken({
            userId: existingUser._id,
            fullName: existingUser.fullName,
            roleId: existingUser.roleId._id,
            roleName: existingUser.roleId.roleName,
        })

        await this.#tokenService.saveRefreshToken({
            userId: existingUser._id,
            refreshToken: refreshToken,
            deviceId: deviceId,
            deviceName: deviceName,
        })

        return {
            accessToken,
            refreshToken,
        }
    }

    refreshToken = async ({
        oldRefreshToken,
        deviceName,
    }) => {
        //verify refresh token
        const decode = await this.#tokenService.verifyRefreshToken({
            token: oldRefreshToken,
        });

        if (!decode) {
            throw new AuthenticationError(`Refresh Token expired!`)
        }

        const user = await this.#userRepository.findByUserId({
            userId: decode.userId,
        })

        if (!user) {
            throw new AuthenticationError(`This token is not match with userId`)
        }

        const isDeleted = await this.#tokenService.revokeRefreshToken({
            userId: decode.userId,
            deviceId: decode.deviceId,
        })

        if (!isDeleted) {
            throw new BadRequestError(`Cannot delete this token or already expired!`)
        };

        const {
            accessToken,
            refreshToken,
            deviceId,
        } = await this.#tokenService.generateToken({
            userId: user._id,
            fullName: user.fullName,
            roleId: user.roleId._id,
            roleName: user.roleId.roleName,
            deviceId: decode.deviceId,
        })

        await this.#tokenService.saveRefreshToken({
            userId: user._id,
            refreshToken: refreshToken,
            deviceId: deviceId,
            deviceName: deviceName,
        });

        return { accessToken, refreshToken }
    }

    logout = async ({
        userId,
        deviceId,
    }) => {
        const isDeleted = await this.#tokenService.revokeRefreshToken({
            userId: userId,
            deviceId: deviceId,
        });

        if (!isDeleted) {
            throw new AuthenticationError(`Cannot delete this session cause it does not exist or it already expired!`)
        }

        return true;
    }
    
    register = async ({
        email,
        password,
        fullName,
        phone,
    }) => {
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await this.#userRepository.findUserByEmail({
            email: normalizedEmail,
        });

        if (existingUser) {
            throw new BadRequestError(`This account already exist!`);
        }

        //hashed password
        const hashedPassword = await this.#hashService.hash({
            string: password,
        })

        const customerRole = await this.#roleRepository.findRoleByName({
            roleName: "CUSTOMER",
        });

        const newUser = await this.#userRepository.createUser({
            email: normalizedEmail,
            password: hashedPassword,
            fullName: fullName,
            phone: phone,
            roleId: customerRole._id
        });

        if (!newUser) {
            throw new Error(`Cannot create account`)
        }

        return {
            ...newUser,
            password: undefined,
            __v: undefined,
        }
    }

    forgotPassword = async ({ email }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.#userRepository.findUserByEmail({ email: normalizedEmail });

        if (!user || user.status === 'LOCKED') {
            throw new BadRequestError(`This email doesn't exits or this account is banned!`);
        }

        const token = crypto.randomBytes(32).toString('hex');
        await this.#passwordResetTokenRepository.saveToken({
            token: token,
            userId: user._id,
        });

        const resetUrl = `${process.env.FE_RESET_PASSWORD_URL}?token=${token}`;

        await this.#sendgridClient.sendPasswordResetEmail({
            toEmail: normalizedEmail,
            fullName: user.fullName,
            resetUrl: resetUrl,
        });

        return {
            message: 'Password reset email sent successfully',
        }
    }

    resetPassword = async ({ token, newPassword }) => {
        const userId = await this.#passwordResetTokenRepository.findUserByToken({ token: token });
        if (!userId) {
            throw new BadRequestError(`Invalid or expired token!`);
        }

        const hashedPassword = await this.#hashService.hash({ string: newPassword });

        await this.#userRepository.changePassword({
            userId,
            newPassword: hashedPassword,
        });

        await this.#passwordResetTokenRepository.deleteToken({ token: token });

        return {
            message: 'Password reset successfully',
        }
    }
}

export default AuthService