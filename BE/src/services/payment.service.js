import { BadRequestError } from "../error/error.js"

class PaymentService {
    #pricePolicyRepository
    constructor({
        pricePolicyRepository,
    }) {
        this.#pricePolicyRepository = pricePolicyRepository
    }

    getAllPricePolicies = async ({
        page,
        limit,
        vehicleTypeId,
    }) => {
        const { 
            pricePolicies, 
            pagination 
        } = await this.#pricePolicyRepository.findAllPricePolicies({
            page,
            limit,
            vehicleTypeId,
        })

        if (!pricePolicies || pricePolicies.length === 0) {
            throw new BadRequestError(`There are not containing any price policies`)
        }

        return {
            pricePolicies,
            pagination
        }
    }
}

export default PaymentService;  