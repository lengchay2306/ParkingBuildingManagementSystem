import { PayOS } from '@payos/node'
import { configDotenv } from 'dotenv'

configDotenv();

const {
    PAYOS_CLIENT_ID,
    PAYOS_API_KEY,
    PAYOS_CHECKSUM_KEY,
} = process.env

if (
    !PAYOS_CLIENT_ID ||
    !PAYOS_API_KEY ||
    !PAYOS_CHECKSUM_KEY
) {
    throw new Error(`Missing PayOS credentials in environment file`)
}

const payosGateway = new PayOS({
    clientId: PAYOS_CLIENT_ID,
    apiKey: PAYOS_API_KEY,
    checksumKey: PAYOS_CHECKSUM_KEY,
});

export default payosGateway