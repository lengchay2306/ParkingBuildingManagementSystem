import User from "../models/User.js"

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
                                        .lean();
        if (!existingUser) {
            return null;
        }

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

        return {
            users,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    }
}

export default UserRepository