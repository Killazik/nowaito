import Redis from 'ioredis';

type CacheLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: string, ttl?: number) => Promise<'OK'>;
};

const memory = new Map<string, string>();
const memoryCache: CacheLike = {
  async get(key: string) {
    return memory.get(key) ?? null;
  },
  async set(key: string, value: string) {
    memory.set(key, value);
    return 'OK';
  },
};

let redisClient: CacheLike = memoryCache;

if (process.env.REDIS_URL) {
  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.connect().then(() => {
    redisClient = client as unknown as CacheLike;
  }).catch(() => {
    redisClient = memoryCache;
  });
}

export const redis: CacheLike = {
  get: (key: string) => redisClient.get(key),
  set: (key: string, value: string, mode?: string, ttl?: number) => redisClient.set(key, value, mode, ttl),
};
