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

    getRevenue = async (req, res, next) => {
        try {
            const { year, month, day, groupBy, status } = req.query;
            const revenue = await this.#dashboardService.getRevenue({
                year: year ? parseInt(year) : undefined,
                month: month ? parseInt(month) : undefined,
                day: day ? parseInt(day) : undefined,
                groupBy,
                status,
            });

            res.status(200).json({
                status: 'success',
                data: { revenue },
                message: 'Revenue fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default DashboardController;
