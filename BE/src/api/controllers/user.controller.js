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
}

export default UserController;