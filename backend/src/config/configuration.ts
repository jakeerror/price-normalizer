export interface AppConfig {
  port: number;
  jwt: { secret: string; expiresIn: string };
  match: { high: number; low: number };
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  redis: { host: string; port: number };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? "8000", 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "60m",
  },
  match: {
    high: parseFloat(process.env.MATCH_HIGH ?? "0.9"),
    low: parseFloat(process.env.MATCH_LOW ?? "0.6"),
  },
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USER ?? "pricenorm",
    password: process.env.DB_PASSWORD ?? "pricenorm",
    database: process.env.DB_NAME ?? "pricenorm",
  },
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  },
});
