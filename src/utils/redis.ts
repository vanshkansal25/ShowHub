import Redis from "ioredis";
import "dotenv/config";

export const redis = new Redis(
    process.env.REDIS_HOST || "redis://localhost:6379"
)

redis.on("connect", () => {
    console.log("Connected to Redis successfully");
});

redis.on("error", (err) => {
    console.error("Failed to connect to Redis", err);
});

export const setCache = async (key: string, value: any, ttlSeconds?: number) => {
    await redis.setex(key,ttlSeconds||3600,JSON.stringify(value))
}

export const getCache = async (key: string) => {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}

export const invalidateCacheByPattern = async (pattern: string) => {
    const keys = await redis.keys(pattern);

    if (keys.length === 0) return;

    await redis.del(...keys);
};