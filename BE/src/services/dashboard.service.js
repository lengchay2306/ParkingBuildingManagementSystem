class DashboardService {
    #dashboardRepository;

    constructor({ dashboardRepository }) {
        this.#dashboardRepository = dashboardRepository;
    }

    getDashboard = async () => {
        return this.#dashboardRepository.getDashboardStats();
    };
}

export default DashboardService;
