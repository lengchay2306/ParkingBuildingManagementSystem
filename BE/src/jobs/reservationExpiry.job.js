import container from "../../container.js";

const EXPIRY_JOB_INTERVAL_MS = 60 * 1000;

export function startReservationExpiryJob() {
    const runExpiryJob = async () => {
        try {
            const scope = container.createScope();
            const reservationService = scope.resolve("reservationService");
            const { expiredCount } = await reservationService.expireOverdueReservations();

            if (expiredCount > 0) {
                console.log(`Expired ${expiredCount} overdue reservation(s)`);
            }
        } catch (error) {
            console.error("Reservation expiry job failed:", error.message);
        }
    };

    runExpiryJob();
    return setInterval(runExpiryJob, EXPIRY_JOB_INTERVAL_MS);
}
