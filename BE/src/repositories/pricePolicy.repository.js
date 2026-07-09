import PricePolicy from "../models/PricePolicy.js";
import { mapMongooseError } from "../utils/mongooseError.js";

class PricePolicyRepository {
    #populateVehicleType = {
        path: 'vehicleTypeId',
        select: '_id type',
    };

    findAllPricePolicies = async ({
        page = 1,
        limit = 10,
        vehicleTypeId,
    }) => {
        const skip = (page - 1) * limit;

        const filter = {};
        if (vehicleTypeId) filter.vehicleTypeId = vehicleTypeId;

        const [pricePolicies, total] = await Promise.all([
            PricePolicy.find(filter)
                .skip(skip)
                .limit(limit)
                .populate(this.#populateVehicleType)
                .sort({ vehicleTypeId: 1, fromHour: 1 })
                .lean(),
            PricePolicy.countDocuments(filter),
        ]);

        return {
            pricePolicies,
            pagination: {
                page,
                limit,
                totalCount: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                totalPage: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: limit,
            },
        };
    };

    findById = async ({ pricePolicyId }) => {
        const pricePolicy = await PricePolicy.findById(pricePolicyId)
            .populate(this.#populateVehicleType)
            .lean();

        return pricePolicy ?? null;
    };

    findMonthlyPriceByVehicleType = async ({ vehicleTypeId }) => {
        const existingPricePolicy = await PricePolicy.findOne({
            vehicleTypeId,
            fromHour: 0,
        }).lean();

        return existingPricePolicy;
    };

    findHourlyPricePoliciesByVehicleType = async ({
        vehicleTypeId,
    }) => {
        const existingPricePolicies = await PricePolicy.find({
            vehicleTypeId,
        }).lean();

        return existingPricePolicies;
    };

    createPricePolicy = async (pricePolicyData) => {
        try {
            const newPricePolicy = await PricePolicy.create(pricePolicyData);
            return PricePolicy.findById(newPricePolicy._id)
                .populate(this.#populateVehicleType)
                .lean();
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    updatePricePolicy = async ({ pricePolicyId, updateData }) => {
        try {
            const updatedPricePolicy = await PricePolicy.findByIdAndUpdate(
                pricePolicyId,
                updateData,
                { new: true, runValidators: true },
            )
                .populate(this.#populateVehicleType)
                .lean();

            return updatedPricePolicy ?? null;
        } catch (error) {
            throw mapMongooseError(error);
        }
    };

    deletePricePolicy = async ({ pricePolicyId }) => {
        const deletedPricePolicy = await PricePolicy.findByIdAndDelete(pricePolicyId)
            .populate(this.#populateVehicleType)
            .lean();

        return deletedPricePolicy ?? null;
    };
}

export default PricePolicyRepository;
