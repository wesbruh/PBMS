const pool = require("../db");
const bcrypt = require("bcryptjs");

const UserModel = {
  async createUser(email, password) {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email, hashed]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
  },

  async updateResetToken(email, token, expiry) {
    await pool.query(
      "UPDATE users SET reset_token=$1, reset_token_expire=$2 WHERE email=$3",
      [token, expiry, email]
    );
  },
};

module.exports = UserModel;
