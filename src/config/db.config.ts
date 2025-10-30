import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    DB: process.env.DATABASE || "edwin",
    USER: process.env.DB_USERNAME || "root",
    PASSWORD: process.env.DB_PASSWORD || "Kaveesha@123",
    HOST: process.env.HOST || "localhost",
    dialect: "mysql",
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }

}

export default dbConfig;