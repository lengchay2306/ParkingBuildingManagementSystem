import { AuthenticationError, BadRequestError } from "../error/error.js";

class AuthService {
    #userRepository;
    #tokenService;
    #hashService;
    #roleRepository
    constructor({
        userRepository,
        tokenService,
        hashService,
        roleRepository
    }) {
        this.#userRepository = userRepository;
        this.#tokenService = tokenService;
        this.#hashService = hashService;
        this.#roleRepository = roleRepository
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
            fullName: existingUser,
            roleId: existingUser.roleId,
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
            // roleName: existingUser.roleId.roleName,

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
            roleId: user.roleId,
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
        //  return {
        //     accessToken,
        //     refreshToken,
        //     roleName: user.roleId.roleName,
        // }
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
}

export default AuthService