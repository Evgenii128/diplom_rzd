const bcrypt = require("bcrypt");

async function generateHash() {
  try {
    const password = "admin123";
    const hash = await bcrypt.hash(password, 10);
    console.log("=".repeat(50));
    console.log("🔐 Пароль:", password);
    console.log("🔑 Хеш:", hash);
    console.log("=".repeat(50));
    console.log("\nSQL запрос для вставки пользователя:");
    console.log("=".repeat(50));
    console.log(`INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active) 
VALUES ('admin', 'admin@rzd-tehservice.ru', '${hash}', 'admin', 'Администратор', 'Системы', true);`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("Ошибка:", error);
  }
}

generateHash();
