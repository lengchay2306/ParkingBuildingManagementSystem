class DashboardController {
    #dashboardService;

    constructor({ dashboardService }) {
        this.#dashboardService = dashboardService;
    }

    getDashboard = async (req, res, next) => {
        try {
            const dashboard = await this.#dashboardService.getDashboard();

            res.status(200).json({
                status: 'success',
                data: dashboard,
                message: 'Dashboard fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default DashboardController;
