import { configDotenv } from 'dotenv'
import IORedis from 'ioredis'
configDotenv();

const redisClient = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS ? {} : undefined,
});

redisClient.on("connect", () => { console.log(`Connected to redis server successfully`) })
redisClient.on("error", () => { console.log(`Cannot connect to redis server`) })

export default redisClient