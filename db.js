const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function testDatabase() {
  const result = await pool.query("SELECT NOW() AS current_time");
  console.log("DATABASE CONNECTED:", result.rows[0].current_time);
}

module.exports = {
  pool,
  testDatabase
};
