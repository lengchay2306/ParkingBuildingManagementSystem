import { NotFoundError } from "../error/error.js";

class PricePolicyService {
    #pricePolicyRepository;

    constructor({ pricePolicyRepository }) {
        this.#pricePolicyRepository = pricePolicyRepository;
    }

    getAllPricePolicies = async ({ page = 1, limit = 10, vehicleTypeId }) => {
        return this.#pricePolicyRepository.findAllPricePolicies({
            page,
            limit,
            vehicleTypeId,
        });
    };

    getPricePolicyById = async ({ pricePolicyId }) => {
        const pricePolicy = await this.#pricePolicyRepository.findById({ pricePolicyId });
        if (!pricePolicy) {
            throw new NotFoundError("Price policy not found");
        }
        return pricePolicy;
    };

    createPricePolicy = async (data) => {
        return this.#pricePolicyRepository.createPricePolicy(data);
    };

    updatePricePolicy = async ({ pricePolicyId, updateData }) => {
        const updatedPricePolicy = await this.#pricePolicyRepository.updatePricePolicy({
            pricePolicyId,
            updateData,
        });
        if (!updatedPricePolicy) {
            throw new NotFoundError("Price policy not found");
        }
        return updatedPricePolicy;
    };

    deletePricePolicy = async ({ pricePolicyId }) => {
        const deletedPricePolicy = await this.#pricePolicyRepository.deletePricePolicy({ pricePolicyId });
        if (!deletedPricePolicy) {
            throw new NotFoundError("Price policy not found");
        }
        return deletedPricePolicy;
    };
}

export default PricePolicyService;
