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
}

export default UserRepository