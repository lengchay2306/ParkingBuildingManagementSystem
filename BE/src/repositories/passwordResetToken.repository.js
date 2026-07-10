// Redis EX expects seconds (15 minutes)
const RESET_PASSWORD_TOKEN_EXPIRATION_TIME = 15 * 60;

class PasswordResetTokenRepository {
    #redis;
    constructor({ redis }) {
        this.#redis = redis;
    }

    #key(token) {
        return `password_reset:${token}`;
    }

    saveToken = async ({ token, userId}) => {
        const key = this.#key(token);
        await this.#redis.set(key, userId.toString(), 'EX', RESET_PASSWORD_TOKEN_EXPIRATION_TIME);
        return true;
    }

    findUserByToken = async ({ token }) => {
        return this.#redis.get(this.#key(token));
    }

    deleteToken = async ({ token }) => {
        return this.#redis.del(this.#key(token));
    }
}

export default PasswordResetTokenRepository;