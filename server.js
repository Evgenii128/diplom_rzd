const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const path = require("path");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));
app.use(cookieParser());

const pool = mysql.createPool({
  host: "cfif31.ru",
  database: "ISPr25-24_StreltsovEV_rzd",
  user: "ISPr25-24_StreltsovEV",
  password: "ISPr25-24_StreltsovEV",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false,
  },
});

function checkAuth(req, res, next) {
  if (
    req.path.startsWith("/api/") ||
    req.path === "/" ||
    req.path === "/request" ||
    req.path === "/style.css" ||
    req.path === "/admin.js" ||
    req.path === "/favicon.ico" ||
    req.path.includes(".")
  ) {
    return next();
  }

  if (req.path === "/admin") {
    const token = req.cookies?.admin_token;

    if (token === "authenticated") {
      return next();
    } else {
      return res.redirect("/?login=required");
    }
  }

  next();
}

app.use(checkAuth);

async function logAudit(action, tableName, details = "", username = "Система") {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (username, action, table_name, details) 
             VALUES (?, ?, ?, ?)`,
      [username, action, tableName, details],
    );
  } catch (error) {
    console.log("⚠️ Не удалось записать лог:", error.message);
  }
}

async function generateRequestNumber(connection) {
  const year = new Date().getFullYear();

  try {
    const [rows] = await connection.execute(
      `SELECT request_number 
             FROM requests 
             WHERE request_number LIKE ? 
             ORDER BY request_number DESC 
             LIMIT 1`,
      [`REQ-${year}-%`],
    );

    if (rows.length === 0) {
      return `REQ-${year}-001`;
    }

    const lastNumber = rows[0].request_number;
    const parts = lastNumber.split("-");
    if (parts.length < 3) {
      return `REQ-${year}-001`;
    }

    const lastSeq = parseInt(parts[2]);

    if (isNaN(lastSeq)) {
      return `REQ-${year}-001`;
    }

    const nextSeq = lastSeq + 1;
    const paddedSeq = nextSeq.toString().padStart(3, "0");

    return `REQ-${year}-${paddedSeq}`;
  } catch (error) {
    console.error("Ошибка при генерации номера заявки:", error);
    const timestamp = Date.now().toString().slice(-6);
    return `REQ-${year}-${timestamp}`;
  }
}

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    console.log("🔄 Инициализация базы данных...");

    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    await connection.execute(`CREATE TABLE IF NOT EXISTS services (
            id INT AUTO_INCREMENT PRIMARY KEY,
            service_code VARCHAR(20) UNIQUE NOT NULL,
            service_name VARCHAR(200) NOT NULL,
            description TEXT,
            unit VARCHAR(20) NOT NULL,
            base_price DECIMAL(10,2) NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    await connection.execute(`CREATE TABLE IF NOT EXISTS clients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            company_name VARCHAR(100) DEFAULT NULL,
            contact_person VARCHAR(100),
            tax_number VARCHAR(20),
            phone VARCHAR(20),
            email VARCHAR(100),
            legal_address TEXT,
            bank_details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);

    await connection.execute(`CREATE TABLE IF NOT EXISTS price_lists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            price_list_name VARCHAR(100) NOT NULL,
            description TEXT,
            valid_from DATE NOT NULL,
            valid_to DATE DEFAULT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    await connection.execute(`CREATE TABLE IF NOT EXISTS price_list_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            price_list_id INT,
            service_id INT,
            price DECIMAL(10,2),
            FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        )`);

    await connection.execute(`CREATE TABLE IF NOT EXISTS contracts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            contract_number VARCHAR(50) NOT NULL UNIQUE,
            client_id INT,
            price_list_id INT,
            contract_date DATE NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            status VARCHAR(20) DEFAULT 'active',
            total_amount DECIMAL(15,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
            FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE SET NULL
        )`);

    await connection.execute(`CREATE TABLE IF NOT EXISTS invoices (
            id INT AUTO_INCREMENT PRIMARY KEY,
            invoice_number VARCHAR(50) NOT NULL UNIQUE,
            contract_id INT,
            invoice_date DATE NOT NULL,
            due_date DATE NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            tax_amount DECIMAL(15,2),
            total_amount DECIMAL(15,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            payment_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
        )`);

    await connection.execute(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'client',
            first_name VARCHAR(50) DEFAULT NULL,
            last_name VARCHAR(50) DEFAULT NULL,
            phone VARCHAR(20) DEFAULT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL DEFAULT NULL
        )`);

    await connection.execute(`
            CREATE TABLE IF NOT EXISTS requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_number VARCHAR(20) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                company_name VARCHAR(100),
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                service_description TEXT,
                selected_services JSON,
                total_amount DECIMAL(15,2) DEFAULT 0,
                preferred_date DATE,
                status ENUM('new', 'in_progress', 'completed', 'cancelled') DEFAULT 'new',
                admin_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log("✅ Таблица requests создана/проверена");

    await connection.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100),
            action VARCHAR(50),
            table_name VARCHAR(100),
            details TEXT,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    const [servicesCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM services",
    );
    if (servicesCount[0].count === 0) {
      await connection.execute(`
                INSERT INTO services (service_code, service_name, description, unit, base_price) VALUES 
                ('SERV-001', 'Техническое обслуживание оборудования', 'Плановое ТО железнодорожного оборудования', 'час', 1500.00),
                ('SERV-002', 'Ремонт путей', 'Восстановление железнодорожного полотна', 'м', 2500.00),
                ('SERV-003', 'Электромонтажные работы', 'Монтаж и обслуживание электрооборудования', 'услуга', 5000.00)
            `);
      console.log("✅ Демо-услуги добавлены");
    }

    const [usersCount] = await connection.execute(
      "SELECT COUNT(*) as count FROM users WHERE username = ?",
      ["admin"],
    );
    if (usersCount[0].count === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await connection.execute(
        `INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "admin",
          "admin@rzd-tehservice.ru",
          hashedPassword,
          "admin",
          "Администратор",
          "Системы",
          true,
        ],
      );
      console.log("✅ Демо-пользователь admin создан (пароль: admin123)");
    } else {
      console.log("✅ Демо-пользователь admin уже существует");
    }

    console.log("✅ Инициализация БД завершена");
  } catch (error) {
    console.error("❌ Ошибка инициализации БД:", error.message);
  } finally {
    connection.release();
  }
}

app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Введите логин и пароль",
    });
  }

  try {
    const [users] = await pool.execute(
      "SELECT * FROM users WHERE username = ? AND is_active = 1",
      [username],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Неверный логин или пароль",
      });
    }

    const user = users[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Неверный логин или пароль",
      });
    }

    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    res.cookie("admin_token", "authenticated", {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    });

    res.cookie(
      "user_info",
      JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username,
      }),
      {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: false,
      },
    );

    await logAudit(
      "LOGIN",
      "users",
      `Вход пользователя: ${user.username}`,
      user.username,
    );

    res.json({
      success: true,
      message: "Вход выполнен успешно",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.username,
      },
    });
  } catch (error) {
    console.error("Ошибка при входе:", error);
    res.status(500).json({
      success: false,
      error: "Ошибка сервера",
    });
  }
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.clearCookie("user_info");
  res.json({ success: true });
});

app.get("/api/admin/check-auth", (req, res) => {
  const token = req.cookies?.admin_token;
  res.json({ authenticated: token === "authenticated" });
});

app.get("/api/admin/current-user", (req, res) => {
  const userInfo = req.cookies?.user_info;

  if (userInfo) {
    try {
      const user = JSON.parse(userInfo);
      res.json({ success: true, user });
    } catch (e) {
      res.json({ success: false });
    }
  } else {
    res.json({ success: false });
  }
});

app.post("/api/public/requests", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    console.log(
      "📥 Получены данные заявки:",
      JSON.stringify(req.body, null, 2),
    );

    const {
      full_name,
      company_name,
      phone,
      email,
      preferred_date,
      selected_services,
      total_amount,
    } = req.body;

    if (!full_name || !phone || !email) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "Заполните все обязательные поля",
      });
    }

    if (
      !selected_services ||
      !Array.isArray(selected_services) ||
      selected_services.length === 0
    ) {
      connection.release();
      return res.status(400).json({
        success: false,
        error: "Выберите хотя бы одну услугу",
      });
    }

    await connection.beginTransaction();

    const requestNumber = await generateRequestNumber(connection);

    const serviceDescription = selected_services
      .map(
        (s) =>
          `${s.service_name} (x${s.quantity}) - ${Number(s.subtotal).toFixed(2)} ₽`,
      )
      .join("; ");

    const [result] = await connection.execute(
      `INSERT INTO requests (
                request_number, 
                full_name, 
                company_name, 
                phone, 
                email, 
                service_description,
                selected_services,
                total_amount,
                preferred_date, 
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      [
        requestNumber,
        full_name,
        company_name || null,
        phone,
        email,
        serviceDescription,
        JSON.stringify(selected_services),
        Number(total_amount) || 0,
        preferred_date || null,
      ],
    );

    console.log(
      "✅ Заявка сохранена, ID:",
      result.insertId,
      "Номер:",
      requestNumber,
    );

    await connection.commit();

    try {
      await pool.execute(
        `INSERT INTO audit_logs (username, action, table_name, details) 
                 VALUES (?, ?, ?, ?)`,
        [
          "Клиент",
          "INSERT",
          "requests",
          `Новая заявка ${requestNumber} на сумму ${total_amount} ₽`,
        ],
      );
    } catch (logError) {
      console.log("⚠️ Не удалось записать лог:", logError.message);
    }

    res.status(201).json({
      success: true,
      message: "Ваша заявка успешно отправлена!",
      request_number: requestNumber,
      total_amount: total_amount,
      services_count: selected_services.length,
    });
  } catch (error) {
    await connection.rollback();

    console.error("❌ Ошибка создания заявки:", error);

    if (error.code === "ER_DUP_ENTRY") {
      try {
        const year = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-6);
        const fallbackNumber = `REQ-${year}-${timestamp}`;

        const [retryResult] = await connection.execute(
          `INSERT INTO requests (
                        request_number, full_name, company_name, phone, email, 
                        service_description, selected_services, total_amount, preferred_date, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
          [
            fallbackNumber,
            req.body.full_name,
            req.body.company_name || null,
            req.body.phone,
            req.body.email,
            req.body.selected_services
              .map(
                (s) =>
                  `${s.service_name} (x${s.quantity}) - ${Number(s.subtotal).toFixed(2)} ₽`,
              )
              .join("; "),
            JSON.stringify(req.body.selected_services),
            Number(req.body.total_amount) || 0,
            req.body.preferred_date || null,
          ],
        );

        await connection.commit();

        console.log("✅ Заявка сохранена с запасным номером:", fallbackNumber);

        return res.status(201).json({
          success: true,
          message: "Ваша заявка успешно отправлена!",
          request_number: fallbackNumber,
          total_amount: req.body.total_amount,
          services_count: req.body.selected_services.length,
        });
      } catch (retryError) {
        console.error("❌ Ошибка при повторной попытке:", retryError);
        await connection.rollback();
        return res.status(500).json({
          success: false,
          error:
            "Ошибка сервера при отправке заявки. Пожалуйста, попробуйте позже.",
        });
      }
    }

    res.status(500).json({
      success: false,
      error: "Ошибка сервера при отправке заявки: " + error.message,
    });
  } finally {
    connection.release();
  }
});

app.get("/api/requests", async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT * FROM requests";
    const params = [];
    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const [rows] = await pool.execute(sql, params);

    rows.forEach((row) => {
      if (row.selected_services && typeof row.selected_services === "string") {
        try {
          row.selected_services = JSON.parse(row.selected_services);
        } catch (e) {
          row.selected_services = [];
        }
      }
    });

    res.json(rows);
  } catch (error) {
    console.error("Ошибка загрузки заявок:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM requests WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Заявка не найдена" });
    }

    const request = rows[0];
    if (
      request.selected_services &&
      typeof request.selected_services === "string"
    ) {
      try {
        request.selected_services = JSON.parse(request.selected_services);
      } catch (e) {
        request.selected_services = [];
      }
    }

    res.json(request);
  } catch (error) {
    console.error("Ошибка загрузки заявки:", error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/requests/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, error: "Статус не указан" });
    }

    const [result] = await pool.execute(
      "UPDATE requests SET status = ?, admin_notes = ? WHERE id = ?",
      [status, admin_notes || null, id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Заявка не найдена" });
    }

    await logAudit(
      "UPDATE",
      "requests",
      `Статус заявки ID:${id} изменен на ${status}`,
      "Администратор",
    );
    res.json({ success: true, message: "Статус заявки обновлен" });
  } catch (error) {
    console.error("Ошибка обновления заявки:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const { search, active } = req.query;
    let sql = "SELECT * FROM services WHERE 1=1";
    const params = [];

    if (active === "true") {
      sql += " AND is_active = true";
    }

    if (search) {
      sql += " AND (service_code LIKE ? OR service_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += " ORDER BY service_code";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM services WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Услуга не найдена" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/services", async (req, res) => {
  try {
    let {
      service_code,
      service_name,
      description,
      unit,
      base_price,
      is_active,
    } = req.body;

    description = description !== undefined ? description : null;
    is_active = is_active !== undefined ? is_active : true;

    const [existing] = await pool.execute(
      "SELECT id FROM services WHERE service_code = ?",
      [service_code],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Код услуги '${service_code}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO services (service_code, service_name, description, unit, base_price, is_active) 
             VALUES (?, ?, ?, ?, ?, ?)`,
      [service_code, service_name, description, unit, base_price, is_active],
    );

    await logAudit(
      "INSERT",
      "services",
      `Создана услуга: ${service_code} - ${service_name}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Услуга успешно добавлена",
      data: {
        id: result.insertId,
        service_code,
        service_name,
        description,
        unit,
        base_price,
        is_active,
      },
    });
  } catch (error) {
    console.error("Ошибка создания услуги:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      service_code,
      service_name,
      description,
      unit,
      base_price,
      is_active,
    } = req.body;

    description = description !== undefined ? description : null;

    const [existing] = await pool.execute(
      "SELECT id FROM services WHERE service_code = ? AND id != ?",
      [service_code, id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Код услуги '${service_code}' уже используется`,
      });
    }

    const [result] = await pool.execute(
      `UPDATE services 
             SET service_code = ?, service_name = ?, description = ?, unit = ?, base_price = ?, is_active = ?
             WHERE id = ?`,
      [
        service_code,
        service_name,
        description,
        unit,
        base_price,
        is_active,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Услуга не найдена" });
    }

    await logAudit(
      "UPDATE",
      "services",
      `Обновлена услуга ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Услуга успешно обновлена" });
  } catch (error) {
    console.error("Ошибка обновления услуги:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [items] = await pool.execute(
      "SELECT id FROM price_list_items WHERE service_id = ?",
      [id],
    );
    if (items.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Нельзя удалить услугу, которая используется в прайс-листах",
      });
    }

    const [result] = await pool.execute("DELETE FROM services WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Услуга не найдена" });
    }

    await logAudit(
      "DELETE",
      "services",
      `Удалена услуга ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Услуга успешно удалена" });
  } catch (error) {
    console.error("Ошибка удаления услуги:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/clients", async (req, res) => {
  try {
    const { search } = req.query;
    let sql = "SELECT * FROM clients WHERE 1=1";
    const params = [];

    if (search) {
      sql += ` AND (company_name LIKE ? OR contact_person LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    sql += " ORDER BY company_name";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute("SELECT * FROM clients WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Клиент не найден" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    let {
      company_name,
      contact_person,
      tax_number,
      phone,
      email,
      legal_address,
      bank_details,
    } = req.body;

    company_name = company_name !== undefined ? company_name : null;
    contact_person = contact_person !== undefined ? contact_person : null;
    tax_number = tax_number !== undefined ? tax_number : null;
    phone = phone !== undefined ? phone : null;
    email = email !== undefined ? email : null;
    legal_address = legal_address !== undefined ? legal_address : null;
    bank_details = bank_details !== undefined ? bank_details : null;

    const [result] = await pool.execute(
      `INSERT INTO clients (company_name, contact_person, tax_number, phone, email, legal_address, bank_details) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name,
        contact_person,
        tax_number,
        phone,
        email,
        legal_address,
        bank_details,
      ],
    );

    await logAudit(
      "INSERT",
      "clients",
      `Создан клиент: ${company_name || "Без названия"}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Клиент успешно добавлен",
      data: {
        id: result.insertId,
        company_name,
        contact_person,
        tax_number,
        phone,
        email,
        legal_address,
        bank_details,
      },
    });
  } catch (error) {
    console.error("Ошибка создания клиента:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      company_name,
      contact_person,
      tax_number,
      phone,
      email,
      legal_address,
      bank_details,
    } = req.body;

    company_name = company_name !== undefined ? company_name : null;
    contact_person = contact_person !== undefined ? contact_person : null;
    tax_number = tax_number !== undefined ? tax_number : null;
    phone = phone !== undefined ? phone : null;
    email = email !== undefined ? email : null;
    legal_address = legal_address !== undefined ? legal_address : null;
    bank_details = bank_details !== undefined ? bank_details : null;

    const [result] = await pool.execute(
      `UPDATE clients 
             SET company_name = ?, contact_person = ?, tax_number = ?, phone = ?, email = ?, 
                 legal_address = ?, bank_details = ?
             WHERE id = ?`,
      [
        company_name,
        contact_person,
        tax_number,
        phone,
        email,
        legal_address,
        bank_details,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Клиент не найден" });
    }

    await logAudit(
      "UPDATE",
      "clients",
      `Обновлен клиент ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Клиент успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления клиента:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [contracts] = await pool.execute(
      "SELECT id FROM contracts WHERE client_id = ?",
      [id],
    );
    if (contracts.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Нельзя удалить клиента, у которого есть договоры. Сначала удалите договоры.",
      });
    }

    const [result] = await pool.execute("DELETE FROM clients WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Клиент не найден" });
    }

    await logAudit(
      "DELETE",
      "clients",
      `Удален клиент ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Клиент успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления клиента:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/price-lists", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM price_lists ORDER BY valid_from DESC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/price-lists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      "SELECT * FROM price_lists WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Прайс-лист не найден" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/price-lists", async (req, res) => {
  try {
    let { price_list_name, description, valid_from, valid_to, is_active } =
      req.body;

    description = description !== undefined ? description : null;
    valid_to = valid_to !== undefined ? valid_to : null;
    is_active = is_active !== undefined ? is_active : true;

    const [result] = await pool.execute(
      `INSERT INTO price_lists (price_list_name, description, valid_from, valid_to, is_active) 
             VALUES (?, ?, ?, ?, ?)`,
      [price_list_name, description, valid_from, valid_to, is_active],
    );

    await logAudit(
      "INSERT",
      "price_lists",
      `Создан прайс-лист: ${price_list_name}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Прайс-лист успешно создан",
      data: {
        id: result.insertId,
        price_list_name,
        description,
        valid_from,
        valid_to,
        is_active,
      },
    });
  } catch (error) {
    console.error("Ошибка создания прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/price-lists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { price_list_name, description, valid_from, valid_to, is_active } =
      req.body;

    description = description !== undefined ? description : null;
    valid_to = valid_to !== undefined ? valid_to : null;

    const [result] = await pool.execute(
      `UPDATE price_lists 
             SET price_list_name = ?, description = ?, valid_from = ?, valid_to = ?, is_active = ?
             WHERE id = ?`,
      [price_list_name, description, valid_from, valid_to, is_active, id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Прайс-лист не найден" });
    }

    await logAudit(
      "UPDATE",
      "price_lists",
      `Обновлен прайс-лист ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Прайс-лист успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/price-lists/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [contracts] = await pool.execute(
      "SELECT id FROM contracts WHERE price_list_id = ?",
      [id],
    );
    if (contracts.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Нельзя удалить прайс-лист, который используется в договорах",
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM price_lists WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Прайс-лист не найден" });
    }

    await logAudit(
      "DELETE",
      "price_lists",
      `Удален прайс-лист ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Прайс-лист успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/price-list-items/:priceListId", async (req, res) => {
  try {
    const { priceListId } = req.params;
    const [rows] = await pool.execute(
      `SELECT pli.*, s.service_name, s.service_code, s.unit, s.base_price as default_price
             FROM price_list_items pli
             JOIN services s ON pli.service_id = s.id
             WHERE pli.price_list_id = ?`,
      [priceListId],
    );
    res.json(rows);
  } catch (error) {
    console.error("Ошибка загрузки позиций прайс-листа:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/price-list-items/:priceListId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { priceListId } = req.params;
    const { items } = req.body;

    await connection.beginTransaction();

    await connection.execute(
      "DELETE FROM price_list_items WHERE price_list_id = ?",
      [priceListId],
    );

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.execute(
          "INSERT INTO price_list_items (price_list_id, service_id, price) VALUES (?, ?, ?)",
          [priceListId, item.service_id, item.price],
        );
      }
    }

    await connection.commit();

    await logAudit(
      "UPDATE",
      "price_list_items",
      `Обновлены позиции прайс-листа ID: ${priceListId}`,
      "Администратор",
    );

    res.json({ success: true, message: "Позиции прайс-листа сохранены" });
  } catch (error) {
    await connection.rollback();
    console.error("Ошибка сохранения позиций прайс-листа:", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

app.get("/api/contracts", async (req, res) => {
  try {
    const { status } = req.query;
    let sql =
      "SELECT c.*, cl.company_name, cl.contact_person FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND c.status = ?";
      params.push(status);
    }

    sql += " ORDER BY c.contract_date DESC";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/contracts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      "SELECT c.*, cl.company_name, cl.contact_person FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Договор не найден" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/contracts", async (req, res) => {
  try {
    let {
      contract_number,
      client_id,
      price_list_id,
      contract_date,
      start_date,
      end_date,
      total_amount,
      status,
    } = req.body;

    price_list_id = price_list_id !== undefined ? price_list_id : null;
    end_date = end_date !== undefined ? end_date : null;
    status = status !== undefined ? status : "active";
    total_amount = total_amount !== undefined ? total_amount : 0;

    const [existing] = await pool.execute(
      "SELECT id FROM contracts WHERE contract_number = ?",
      [contract_number],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Договор с номером '${contract_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO contracts (contract_number, client_id, price_list_id, contract_date, start_date, end_date, total_amount, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contract_number,
        client_id,
        price_list_id,
        contract_date,
        start_date,
        end_date,
        total_amount,
        status,
      ],
    );

    await logAudit(
      "INSERT",
      "contracts",
      `Создан договор: ${contract_number}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Договор успешно создан",
      data: {
        id: result.insertId,
        contract_number,
        client_id,
        price_list_id,
        contract_date,
        start_date,
        end_date,
        total_amount,
        status,
      },
    });
  } catch (error) {
    console.error("Ошибка создания договора:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/contracts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      contract_number,
      client_id,
      price_list_id,
      contract_date,
      start_date,
      end_date,
      total_amount,
      status,
    } = req.body;

    price_list_id = price_list_id !== undefined ? price_list_id : null;
    end_date = end_date !== undefined ? end_date : null;

    const [existing] = await pool.execute(
      "SELECT id FROM contracts WHERE contract_number = ? AND id != ?",
      [contract_number, id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Договор с номером '${contract_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      `UPDATE contracts 
             SET contract_number = ?, client_id = ?, price_list_id = ?, contract_date = ?, 
                 start_date = ?, end_date = ?, total_amount = ?, status = ?
             WHERE id = ?`,
      [
        contract_number,
        client_id,
        price_list_id,
        contract_date,
        start_date,
        end_date,
        total_amount,
        status,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Договор не найден" });
    }

    await logAudit(
      "UPDATE",
      "contracts",
      `Обновлен договор ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Договор успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления договора:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/contracts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [invoices] = await pool.execute(
      "SELECT id FROM invoices WHERE contract_id = ?",
      [id],
    );
    if (invoices.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          "Нельзя удалить договор, у которого есть счета. Сначала удалите счета.",
      });
    }

    const [result] = await pool.execute("DELETE FROM contracts WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Договор не найден" });
    }

    await logAudit(
      "DELETE",
      "contracts",
      `Удален договор ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Договор успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления договора:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/invoices", async (req, res) => {
  try {
    const { status } = req.query;
    let sql =
      "SELECT i.*, c.contract_number, cl.company_name FROM invoices i LEFT JOIN contracts c ON i.contract_id = c.id LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1";
    const params = [];

    if (status) {
      if (status === "overdue") {
        sql += " AND i.status = ? AND i.due_date < CURDATE()";
        params.push("pending");
      } else {
        sql += " AND i.status = ?";
        params.push(status);
      }
    }

    sql += " ORDER BY i.invoice_date DESC";

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT i.*, c.contract_number, cl.company_name 
             FROM invoices i 
             LEFT JOIN contracts c ON i.contract_id = c.id 
             LEFT JOIN clients cl ON c.client_id = cl.id 
             WHERE i.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  try {
    let {
      invoice_number,
      contract_id,
      invoice_date,
      due_date,
      amount,
      tax_amount,
      total_amount,
      status,
      notes,
    } = req.body;

    tax_amount = tax_amount !== undefined ? tax_amount : 0;
    notes = notes !== undefined ? notes : null;
    status = status !== undefined ? status : "pending";

    const [existing] = await pool.execute(
      "SELECT id FROM invoices WHERE invoice_number = ?",
      [invoice_number],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Счет с номером '${invoice_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO invoices (invoice_number, contract_id, invoice_date, due_date, amount, tax_amount, total_amount, status, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        contract_id,
        invoice_date,
        due_date,
        amount,
        tax_amount,
        total_amount,
        status,
        notes,
      ],
    );

    await logAudit(
      "INSERT",
      "invoices",
      `Создан счет: ${invoice_number}`,
      "Администратор",
    );

    res.status(201).json({
      success: true,
      message: "Счет успешно создан",
      data: {
        id: result.insertId,
        invoice_number,
        contract_id,
        invoice_date,
        due_date,
        amount,
        tax_amount,
        total_amount,
        status,
        notes,
      },
    });
  } catch (error) {
    console.error("Ошибка создания счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let {
      invoice_number,
      contract_id,
      invoice_date,
      due_date,
      amount,
      tax_amount,
      total_amount,
      status,
      notes,
      payment_date,
    } = req.body;

    tax_amount = tax_amount !== undefined ? tax_amount : 0;
    notes = notes !== undefined ? notes : null;
    payment_date = payment_date !== undefined ? payment_date : null;

    const [existing] = await pool.execute(
      "SELECT id FROM invoices WHERE invoice_number = ? AND id != ?",
      [invoice_number, id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Счет с номером '${invoice_number}' уже существует`,
      });
    }

    const [result] = await pool.execute(
      `UPDATE invoices 
             SET invoice_number = ?, contract_id = ?, invoice_date = ?, due_date = ?, 
                 amount = ?, tax_amount = ?, total_amount = ?, status = ?, notes = ?, payment_date = ?
             WHERE id = ?`,
      [
        invoice_number,
        contract_id,
        invoice_date,
        due_date,
        amount,
        tax_amount,
        total_amount,
        status,
        notes,
        payment_date,
        id,
      ],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден" });
    }

    await logAudit(
      "UPDATE",
      "invoices",
      `Обновлен счет ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Счет успешно обновлен" });
  } catch (error) {
    console.error("Ошибка обновления счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/invoices/:id/pay", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date } = req.body;

    const [result] = await pool.execute(
      `UPDATE invoices 
             SET status = 'paid', payment_date = ? 
             WHERE id = ? AND status = 'pending'`,
      [payment_date || new Date().toISOString().split("T")[0], id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден или уже оплачен" });
    }

    await logAudit(
      "UPDATE",
      "invoices",
      `Счет ID: ${id} отмечен как оплаченный`,
      "Администратор",
    );
    res.json({ success: true, message: "Счет отмечен как оплаченный" });
  } catch (error) {
    console.error("Ошибка обновления счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute("DELETE FROM invoices WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Счет не найден" });
    }

    await logAudit(
      "DELETE",
      "invoices",
      `Удален счет ID: ${id}`,
      "Администратор",
    );
    res.json({ success: true, message: "Счет успешно удален" });
  } catch (error) {
    console.error("Ошибка удаления счета:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/audit-logs", async (req, res) => {
  try {
    const { limit } = req.query;
    let sql = "SELECT * FROM audit_logs ORDER BY changed_at DESC";

    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        sql += ` LIMIT ${limitNum}`;
      }
    }

    const [rows] = await pool.execute(sql);
    res.json(rows);
  } catch (error) {
    console.error("Ошибка загрузки логов:", error.message);
    res.json([]);
  }
});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [reqNew] = await pool.execute(
      "SELECT COUNT(*) as count FROM requests WHERE status = 'new'",
    );
    const [reqTotal] = await pool.execute(
      "SELECT COUNT(*) as count FROM requests",
    );
    const [clients] = await pool.execute(
      "SELECT COUNT(*) as count FROM clients",
    );
    const [services] = await pool.execute(
      "SELECT COUNT(*) as count FROM services WHERE is_active = true",
    );
    const [contracts] = await pool.execute(
      "SELECT COUNT(*) as count FROM contracts WHERE status = 'active'",
    );
    const [invoices] = await pool.execute(
      "SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'",
    );
    const [totalRevenue] = await pool.execute(
      "SELECT SUM(total_amount) as total FROM invoices WHERE status = 'paid'",
    );

    res.json({
      newRequests: reqNew[0].count,
      totalRequests: reqTotal[0].count,
      clients: clients[0].count,
      services: services[0].count,
      activeContracts: contracts[0].count,
      pendingInvoices: invoices[0].count,
      totalRevenue: totalRevenue[0].total || 0,
    });
  } catch (error) {
    console.error("Ошибка статистики:", error);
    res.json({
      newRequests: 0,
      totalRequests: 0,
      clients: 0,
      services: 0,
      activeContracts: 0,
      pendingInvoices: 0,
      totalRevenue: 0,
    });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT VERSION() as version");
    connection.release();
    res.json({
      status: "OK",
      database: { connected: true, version: rows[0].version },
    });
  } catch (error) {
    res.status(500).json({ status: "ERROR", message: error.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/request", (req, res) => {
  res.sendFile(path.join(__dirname, "request.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Подключение к MySQL установлено!");
    connection.release();
    await initializeDatabase();
  } catch (err) {
    console.error("❌ Ошибка подключения к MySQL:", err.message);
    console.log("\n🔄 Запускаю сервер в режиме эмуляции...");
  }

  app.listen(PORT, () => {
    console.log("=".repeat(60));
    console.log('🚀 СИСТЕМА "РЖД-ТЕХСЕРВИС" - ПОДАЧА ЗАЯВЛЕНИЙ');
    console.log("=".repeat(60));
    console.log(`🌐 Главная страница:  http://localhost:${PORT}`);
    console.log(`📝 Подать заявление:  http://localhost:${PORT}/request`);
    console.log(`⚙️ Панель управления: http://localhost:${PORT}/admin`);
    console.log("=".repeat(60));
    console.log(
      `📊 API статистика:    http://localhost:${PORT}/api/dashboard/stats`,
    );
    console.log(`📋 API услуги:        http://localhost:${PORT}/api/services`);
    console.log(`📋 API заявки:        http://localhost:${PORT}/api/requests`);
    console.log(`📋 API договоры:      http://localhost:${PORT}/api/contracts`);
    console.log(`📋 API счета:         http://localhost:${PORT}/api/invoices`);
    console.log(
      `📋 API прайс-листы:   http://localhost:${PORT}/api/price-lists`,
    );
    console.log("=".repeat(60));
    console.log("🔐 Данные для входа: admin / admin123");
    console.log("=".repeat(60));
  });
}

startServer();
