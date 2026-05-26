import { BadRequestError, NotFoundError } from "../error/error";

class UserService {
    #userRepository;

    constructor({ userRepository }) {
        this.#userRepository = userRepository;
    }

    getAllUser = async ({
        page = 1,
        limit = 10,
        search,
        status,
        roleId,
        sortBy = "createdAt",
        sortOrder = "desc",
    }) => {
        const users = await this.#userRepository.getAllUser({
            page,
            limit,
            search,
            status,
            roleId,
            sortBy,
            sortOrder,
        });
        return users;
    }

    getMyProfile = async ({ userId }) => {
        const user = await this.#userRepository.findByUserId({ userId });
        if (!user) {
            throw new NotFoundError("User not found");
        }
        return user;
    }
}

export default UserService;