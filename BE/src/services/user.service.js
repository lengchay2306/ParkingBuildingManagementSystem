import { BadRequestError, ConflictError, NotFoundError } from "../error/error.js";
import Role from "../models/Role.js";

class UserService {
    #userRepository;
    #hashService;
    #vehicleService;
    #vehicleRepository;

    constructor({ userRepository, hashService, vehicleService, vehicleRepository }) {
        this.#userRepository = userRepository;
        this.#hashService = hashService;
        this.#vehicleService = vehicleService;
        this.#vehicleRepository = vehicleRepository;
    }

    #handleCreateUserVehicles = async ({ userId, vehicles }) => {
        if (!vehicles?.length) {
            return;
        }

        for (const item of vehicles) {
            await this.#vehicleService.adminCreateVehicleForUser({
                userId,
                licensePlate: item.licensePlate,
                vehicleTypeId: item.vehicleTypeId,
                monthlyCardId: item.monthlyCardId,
                status: item.status,
            });
        }
    }

    #handleUpdateUserVehicles = async ({ userId, vehicles }) => {
        if (!vehicles?.length) {
            return;
        }

        for (const item of vehicles) {
            const { action, vehicleId, licensePlate, vehicleTypeId, monthlyCardId, status } = item;

            if (action === 'delete') {
                await this.#vehicleService.adminDeleteVehicle({ vehicleId, userId });
                continue;
            }

            if (action === 'update') {
                const updateData = {};
                if (licensePlate !== undefined) updateData.licensePlate = licensePlate;
                if (vehicleTypeId !== undefined) updateData.vehicleTypeId = vehicleTypeId;
                if (monthlyCardId !== undefined) updateData.monthlyCardId = monthlyCardId;
                if (status !== undefined) updateData.status = status;

                if (Object.keys(updateData).length === 0) {
                    throw new BadRequestError("At least one vehicle field must be provided for update");
                }

                const existingVehicle = await this.#vehicleRepository.getVehicleById({ vehicleId });
                if (!existingVehicle) {
                    throw new NotFoundError("Vehicle not found");
                }

                if (existingVehicle.userId.toString() !== userId.toString()) {
                    throw new BadRequestError("Vehicle does not belong to this user");
                }

                await this.#vehicleService.adminUpdateVehicle({ vehicleId, updateData });
                continue;
            }

            if (action === 'create') {
                await this.#vehicleService.adminCreateVehicleForUser({
                    userId,
                    licensePlate,
                    vehicleTypeId,
                    monthlyCardId,
                    status,
                });
            }
        }
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

    getUserById = async ({ userId }) => {
        const user = await this.#userRepository.findByUserId({ userId });
        if (!user) {
            throw new NotFoundError("User not found");
        }
        return user;
    }

    createUser = async ({
        email,
        password,
        fullName,
        phone,
        roleId,
        status = "ACTIVE",
        vehicles,
    }) => {
        const normalizedEmail = email.trim().toLowerCase();

        const existingByEmail = await this.#userRepository.findUserByEmail({
            email: normalizedEmail,
        });
        if (existingByEmail) {
            throw new ConflictError("Email already in use");
        }

        const existingByPhone = await this.#userRepository.findUser({ phone });
        if (existingByPhone) {
            throw new ConflictError("Phone number already in use");
        }

        const role = await Role.findById(roleId).lean();
        if (!role) {
            throw new NotFoundError("Role not found");
        }

        const hashedPassword = await this.#hashService.hash({ string: password });

        const newUser = await this.#userRepository.createUser({
            email: normalizedEmail,
            password: hashedPassword,
            fullName,
            phone,
            roleId,
            status,
        });

        await this.#handleCreateUserVehicles({ userId: newUser._id, vehicles });

        return this.#userRepository.findByUserId({ userId: newUser._id });
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

        const { vehicles, ...userFields } = updateData;

        if (userFields.roleId) {
            const role = await Role.findById(userFields.roleId).lean();
            if (!role) {
                throw new NotFoundError("Role not found");
            }
        }

        if (userFields.password) {
            userFields.password = await this.#hashService.hash({
                string: userFields.password,
            });
        }

        await this.#assertUniqueEmailAndPhone({ userId, updateData: userFields });

        if (Object.keys(userFields).length > 0) {
            const updatedUser = await this.#userRepository.updateUserById({
                userId,
                updateData: userFields,
            });
            if (!updatedUser) {
                throw new NotFoundError("User not found");
            }
        }

        await this.#handleUpdateUserVehicles({ userId, vehicles });

        return this.#userRepository.findByUserId({ userId });
    }

    deleteUserById = async ({ userId }) => {
        const existingUser = await this.#userRepository.findByUserId({ userId });
        if (!existingUser) {
            throw new NotFoundError("User not found");
        }

        const deletedVehicles = await this.#vehicleRepository.deleteVehiclesByUserId({ userId });
        const deletedUser = await this.#userRepository.deleteUserById({ userId });

        return {
            ...deletedUser,
            vehicles: deletedVehicles,
        };
    }

    changePassword = async ({ userId, oldPassword, newPassword }) => {
        const existingUser = await this.#userRepository.findUser({ _id: userId });
        if (!existingUser) {
            throw new NotFoundError("User not found");
        }

        const isPasswordCorrect = await this.#hashService.compare({
            string: oldPassword,
            hashed: existingUser.password,
        });
        if (!isPasswordCorrect) {
            throw new BadRequestError("Old password is incorrect");
        }

        const isSameAsCurrent = await this.#hashService.compare({
            string: newPassword,
            hashed: existingUser.password,
        });
        if (isSameAsCurrent) {
            throw new BadRequestError("New password must be different from old password");
        }

        const hashedNewPassword = await this.#hashService.hash({ string: newPassword });
        const updatedUser = await this.#userRepository.changePassword({
            userId,
            newPassword: hashedNewPassword,
        });
        if (!updatedUser) {
            throw new NotFoundError("User not found");
        }

        return this.#userRepository.findByUserId({ userId });
    }
}

export default UserService;
