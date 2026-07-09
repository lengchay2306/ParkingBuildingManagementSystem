import { BadRequestError } from "../error/error.js";

class DashboardService {
    #dashboardRepository;

    constructor({ dashboardRepository }) {
        this.#dashboardRepository = dashboardRepository;
    }

    getDashboard = async () => {
        return this.#dashboardRepository.getDashboardStats();
    };

    getRevenue = async ({ year, month, day, groupBy, status }) => {
        const result = await this.#dashboardRepository.getRevenueStats({
            year,
            month,
            day,
            groupBy,
            status,
        });

        if (result.error) {
            throw new BadRequestError(result.error);
        }

        return result;
    };
}

export default DashboardService;
