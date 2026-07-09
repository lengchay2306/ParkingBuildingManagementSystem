import User from "../models/User.js"
import Vehicle from "../models/Vehicle.js"
import { mapMongooseError } from "../utils/mongooseError.js"

class UserRepository {
    findUserByEmail = async ({ email }) => {
        const existingUser = await User.findOne({ email })
                                        .populate('roleId')
                                        .lean();
        if (!existingUser) {
            return null;
        }

        return existingUser;
    }

    findUser = async (filter) => {
        const existingUser = await User.findOne(filter)
                                        .populate('roleId')
                                        .lean();

        if (!existingUser) {
            return null
        }
        return existingUser
    }

    findByUserId = async ({ userId }) => {
        const existingUser = await User.findById(userId)
                                        .populate('roleId')
                                        .select('-password')
                                        .lean();
        if (!existingUser) {
            return null;
        }

        const vehicles = await Vehicle.find({ userId })
                                        .populate('vehicleTypeId')
                                        .populate('monthlyCardId')
                                        .lean();

        existingUser.vehicles = vehicles;
        return existingUser;
    }

    createUser = async ({
        email,
        password,
        fullName,
        phone,
        roleId,
        status = "ACTIVE",
    }) => {
        const newUser = await User.create({
            email,
            password,
            fullName,
            phone,
            roleId,
            status,
        });

        return newUser.toObject();
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
        const filter = {};

        if (search) {
            filter.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            filter.status = status;
        }

        if (roleId) {
            filter.roleId = roleId;
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [users, totalCount] = await Promise.all([
            User.find(filter)
                .populate("roleId")
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select("-password")
                .lean(),
            User.countDocuments(filter),
        ]);

        const userIds = users.map(u => u._id);
        const vehicles = await Vehicle.find({ userId: { $in: userIds } })
                                        .populate('vehicleTypeId')
                                        .populate('monthlyCardId')
                                        .lean();

        const vehiclesByUserId = {};
        for (const vehicle of vehicles) {
            const key = vehicle.userId.toString();
            if (!vehiclesByUserId[key]) {
                vehiclesByUserId[key] = [];
            }
            vehiclesByUserId[key].push(vehicle);
        }

        const usersWithVehicles = users.map(user => ({
            ...user,
            vehicles: vehiclesByUserId[user._id.toString()] || [],
        }));

        return {
            users: usersWithVehicles,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }

    #updateUserRecord = async ({ userId, updateData }) => {
        try {
            const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
                new: true,
                runValidators: true,
            })
                .populate('roleId')
                .select('-password')
                .lean();

            if (!updatedUser) {
                return null;
            }
            return updatedUser;
        } catch (error) {
            throw mapMongooseError(error);
        }
    }

    updateMyProfile = async ({ userId, updateData }) => {
        return this.#updateUserRecord({ userId, updateData });
    }

    updateUserById = async ({ userId, updateData }) => {
        return this.#updateUserRecord({ userId, updateData });
    };

    deleteUserById = async ({ userId }) => {
        const deletedUser = await User.findByIdAndDelete(userId)
            .populate('roleId')
            .select('-password')
            .lean();

        if (!deletedUser) {
            return null;
        }

        return deletedUser;
    };
}

export default UserRepository