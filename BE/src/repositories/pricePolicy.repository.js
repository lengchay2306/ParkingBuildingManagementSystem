import PricePolicy from "../models/PricePolicy.js"

class PricePolicyRepository {
    findAllPricePolicies = async ({
        page,
        limit,
        vehicleTypeId,
    }) => {
        const skip = (page - 1) * limit
        
        const filter = {}

        if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId

        const [pricePolicies, total] = await Promise.all([
            PricePolicy.find(filter)
                        .skip(skip)
                        .limit(limit)
                        .populate({
                            path: 'vehicleTypeId',
                            select: 'type -_id'
                        })
                        .lean(),
            PricePolicy.countDocuments(filter)
        ])

        return {
            pricePolicies,
            pagination: {
                currentPage: page,
                totalPage: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
            }
        }
    }

    findMonthlyPriceByVehicleType = async ({
        vehicleTypeId,
    }) => {
        const existingPricePolicy = await PricePolicy.findOne({
            vehicleTypeId,
            fromHour: 0,
        }).lean();

        return existingPricePolicy
    }

    findHourlyPricePoliciesByVehicleType = async ({
        vehicleTypeId,
    }) => {
        const existingPricePolicies = await PricePolicy.find({
            vehicleTypeId,
        }).lean();

        return existingPricePolicies
    }
}

export default PricePolicyRepository