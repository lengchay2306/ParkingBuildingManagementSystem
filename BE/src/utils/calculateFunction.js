import { BadRequestError } from "../error/error.js";

export function calculatedParkingFee ({
    checkInTime,
    checkOutTime,
    pricePolicies,
}) {
    const totalMs = new Date(checkOutTime) - new Date(checkInTime);

    if (totalMs < 0) {
        throw new BadRequestError(`checkOutTime must be after checkInTime`)
    }

    let totalHours = Math.ceil(totalMs / (1000 * 60 * 60))
    totalHours = Math.max(totalHours, 1);
    
    const sortedPolicies = [...pricePolicies].sort(
        (a, b) => a.fromHour - b.fromHour
    );

    let fee = 0;
    let hoursCounted = 0

    for ( const policy of sortedPolicies ) {
        if (hoursCounted >= totalHours) {
            break;
        }

        const tierStart = policy.fromHour;
        const tierEnd = policy.toHour >= 9999 ? Infinity : policy.toHour
        const tierCapacity = tierEnd - tierStart

        const remainingHours = totalHours - hoursCounted
        const hoursInTier = Math.min(remainingHours, tierCapacity)

        if (hoursInTier > 0) {
            fee += hoursInTier * policy.ratePerHour
            hoursCounted += hoursInTier
        }
    }

    return {
        calculatedFee: fee,
        totalHours
    }
}