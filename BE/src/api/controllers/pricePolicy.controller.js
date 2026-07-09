class PricePolicyController {
    #pricePolicyService;

    constructor({ pricePolicyService }) {
        this.#pricePolicyService = pricePolicyService;
    }

    getAllPricePolicies = async (req, res, next) => {
        try {
            const { page, limit, vehicleTypeId } = req.query;
            const result = await this.#pricePolicyService.getAllPricePolicies({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
                vehicleTypeId,
            });

            res.status(200).json({
                status: 'success',
                data: {
                    pricePolicies: result.pricePolicies,
                    pagination: result.pagination,
                },
                message: 'Price policies fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    getPricePolicyById = async (req, res, next) => {
        try {
            const { pricePolicyId } = req.params;
            const pricePolicy = await this.#pricePolicyService.getPricePolicyById({ pricePolicyId });

            res.status(200).json({
                status: 'success',
                data: { pricePolicy },
                message: 'Price policy fetched successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    createPricePolicy = async (req, res, next) => {
        try {
            const pricePolicy = await this.#pricePolicyService.createPricePolicy(req.body);

            res.status(201).json({
                status: 'success',
                data: { pricePolicy },
                message: 'Price policy created successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    updatePricePolicy = async (req, res, next) => {
        try {
            const { pricePolicyId } = req.params;
            const pricePolicy = await this.#pricePolicyService.updatePricePolicy({
                pricePolicyId,
                updateData: req.body,
            });

            res.status(200).json({
                status: 'success',
                data: { pricePolicy },
                message: 'Price policy updated successfully',
            });
        } catch (error) {
            next(error);
        }
    };

    deletePricePolicy = async (req, res, next) => {
        try {
            const { pricePolicyId } = req.params;
            const pricePolicy = await this.#pricePolicyService.deletePricePolicy({ pricePolicyId });

            res.status(200).json({
                status: 'success',
                data: { pricePolicy },
                message: 'Price policy deleted successfully',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default PricePolicyController;
