class UserController {
    #userService;

    constructor({ userService }) {
        this.#userService = userService;
    }

    getAllUser = async (req, res, next) => {
        try {
            const { page, limit, search, status, roleId, sortBy, sortOrder } = req.query;
            const result = await this.#userService.getAllUser({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                search,
                status,
                roleId,
                sortBy,
                sortOrder,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    users: result.users,
                    pagination: result.pagination,
                },
                message: 'Users fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    getUserById = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const user = await this.#userService.getUserById({ userId });
            res.status(200).json({
                status: 'success',
                data: { user },
                message: 'User fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    createUser = async (req, res, next) => {
        try {
            const { email, password, fullName, phone, roleId, status, vehicles } = req.body;
            const user = await this.#userService.createUser({
                email,
                password,
                fullName,
                phone,
                roleId,
                status,
                vehicles,
            });
            res.status(201).json({
                status: 'success',
                data: { user },
                message: 'User created successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    getMyProfile = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const user = await this.#userService.getMyProfile({ userId });
            res.status(200).json({
                status: 'success',
                data: { user: user,
                    message: 'Profile fetched successfully',   
                }
            });
        } catch (error) {
            next(error);
        }
    }

    updateMyProfile = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const updateData = req.body;
            const updatedUser = await this.#userService.updateMyProfile({ userId, updateData });
            res.status(200).json({
                status: 'success',
                data: { user: updatedUser },
                message: 'Profile updated successfully',
            }); 
        } catch (error) {
            next(error);
        }
    }

    updateUserById = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const updateData = req.body;
            const updatedUser = await this.#userService.updateUserById({ userId, updateData });
            res.status(200).json({
                status: 'success',
                data: { user: updatedUser },
                message: 'User updated successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    getUserDeletionEligibility = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const eligibility = await this.#userService.getUserDeletionEligibility({ userId });
            res.status(200).json({
                status: 'success',
                data: { eligibility },
                message: 'User deletion eligibility fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    deleteUserById = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const deletedUser = await this.#userService.deleteUserById({ userId });
            res.status(200).json({
                status: 'success',
                data: { user: deletedUser },
                message: 'User deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    changePassword = async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { oldPassword, newPassword } = req.body;
            const updatedUser = await this.#userService.changePassword({
                userId,
                oldPassword,
                newPassword,
            });
            res.status(200).json({
                status: 'success',
                data: { user: updatedUser },
                message: 'Password changed successfully',
            });
        } catch (error) {
            next(error);
        }
    }
}

export default UserController;
