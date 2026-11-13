export const config = {
  port: Number(process.env.PORT ?? 3000),
  postgresUrl: process.env.DATABASE_URL ?? 'postgres://logpose:logpose@localhost:5432/logpose',
  mongoUrl: process.env.MONGO_URL ?? 'mongodb://localhost:27017',
  mongoBase: process.env.MONGO_DB ?? 'logpose',
};
