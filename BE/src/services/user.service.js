import { ConflictError, NotFoundError } from "../error/error.js";
import Role from "../models/Role.js";

class UserService {
    #userRepository;

    constructor({ userRepository }) {
        this.#userRepository = userRepository;
    }

    #assertUniqueEmailAndPhone = async ({ userId, updateData }) => {
        if (updateData.email !== undefined) {
            const normalizedEmail = updateData.email.trim().toLowerCase();
            const existingByEmail = await this.#userRepository.findUserByEmail({
                email: normalizedEmail,
            });
            if (existingByEmail && existingByEmail._id.toString() !== userId.toString()) {
                throw new ConflictError("Email already in use");
            }
            updateData.email = normalizedEmail;
        }

        if (updateData.phone !== undefined) {
            const existingByPhone = await this.#userRepository.findUser({
                phone: updateData.phone,
            });
            if (existingByPhone && existingByPhone._id.toString() !== userId.toString()) {
                throw new ConflictError("Phone number already in use");
            }
        }
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

    updateMyProfile = async ({ userId, updateData}) => {
        await this.#assertUniqueEmailAndPhone({ userId, updateData });

        const updatedUser = await this.#userRepository.updateMyProfile({ userId, updateData });
        if (!updatedUser) {
            throw new NotFoundError("User not found");
        }
        return updatedUser;
    }

    updateUserById = async ({ userId, updateData }) => {
        const existingUser = await this.#userRepository.findByUserId({ userId });
        if (!existingUser) {
            throw new NotFoundError("User not found");
        }

        if (updateData.roleId) {
            const role = await Role.findById(updateData.roleId).lean();
            if (!role) {
                throw new NotFoundError("Role not found");
            }
        }

        await this.#assertUniqueEmailAndPhone({ userId, updateData });

        const updatedUser = await this.#userRepository.updateUserById({ userId, updateData });
        return updatedUser;
    }
}

export default UserService;