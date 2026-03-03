const API_BASE_URL = "/api";
let currentDeleteAction = null;
let servicesForPriceList = [];

document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/api/admin/check-auth");
    const data = await response.json();

    if (!data.authenticated) {
      window.location.href = "/?login=required";
      return;
    }

    console.log("⚙️ Панель управления РЖД-ТехСервис запущена");
    initTheme();
    initNavigation();
    checkDatabaseConnection();
    updateServerTime();
    setInterval(updateServerTime, 1000);
    loadInitialData();
    initModals();
    loadUserInfo();

    const confirmBtn = document.getElementById("confirmDeleteBtn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (currentDeleteAction) currentDeleteAction();
        closeModal("deleteModal");
      });
    }

    const today = new Date().toISOString().split("T")[0];
    document.querySelectorAll('input[type="date"]').forEach((input) => {
      if (!input.value) {
        input.value = today;
      }
    });
  } catch (error) {
    console.error("Ошибка проверки авторизации:", error);
    window.location.href = "/?login=required";
  }
});

async function loadUserInfo() {
  try {
    const response = await fetch("/api/admin/current-user");
    const data = await response.json();

    if (data.success && data.user) {
      document.getElementById("adminUserName").textContent =
        data.user.name || data.user.username;
      document.getElementById("adminUserRole").textContent =
        data.user.role === "admin" ? "Администратор" : "Сотрудник";
    }
  } catch (error) {
    console.error("Ошибка загрузки информации о пользователе:", error);
  }
}

async function logout() {
  if (confirm("Вы уверены, что хотите выйти?")) {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Ошибка выхода:", error);
      window.location.href = "/";
    }
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const themeIcon = document.querySelector('.btn-icon[title="Сменить тему"] i');
  if (themeIcon) {
    themeIcon.className = savedTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  const themeIcon = document.querySelector('.btn-icon[title="Сменить тему"] i');
  if (themeIcon) {
    themeIcon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  showNotification(
    `Переключена ${newTheme === "dark" ? "тёмная" : "светлая"} тема`,
    "info",
  );
}

async function checkDatabaseConnection() {
  const indicator = document.getElementById("dbStatusIndicator");
  const statusText = document.getElementById("dbStatusText");

  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();

    if (data.status === "OK") {
      indicator.className = "status-indicator connected";
      statusText.textContent = ``;
    } else {
      throw new Error("Ошибка подключения");
    }
  } catch (error) {
    indicator.className = "status-indicator error";
    statusText.textContent = "Ошибка подключения к БД";
    console.error("❌ Ошибка подключения к БД:", error);
  }
}

function updateServerTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("ru-RU");
  const timeElement = document.querySelector("#serverTime span");
  if (timeElement) {
    timeElement.textContent = timeString;
  }
}

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".content-section");

  navItems.forEach((item) => {
    item.addEventListener("click", function () {
      const sectionId = this.getAttribute("data-section");

      navItems.forEach((nav) => nav.classList.remove("active"));
      sections.forEach((section) => section.classList.remove("active"));

      this.classList.add("active");
      document.getElementById(sectionId).classList.add("active");

      loadSectionData(sectionId);
    });
  });
}

function loadInitialData() {
  loadDashboardData();
  loadRequests();
  loadServices();
  loadClients();
  loadPriceLists();
  loadContracts();
  loadInvoices();
}

function loadSectionData(sectionId) {
  switch (sectionId) {
    case "dashboard":
      loadDashboardData();
      break;
    case "requests":
      loadRequests();
      break;
    case "services":
      loadServices();
      break;
    case "clients":
      loadClients();
      break;
    case "price-lists":
      loadPriceLists();
      break;
    case "contracts":
      loadContracts();
      break;
    case "invoices":
      loadInvoices();
      break;
  }
}



async function loadDashboardData() {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
    const data = await response.json();

    console.log("Данные дашборда:", data); 

    
    if (document.getElementById("statTotalRevenue")) {
      document.getElementById("statTotalRevenue").textContent = formatCurrency(
        data.totalRevenue || 0,
      );
    }

    if (document.getElementById("statActiveContracts")) {
      document.getElementById("statActiveContracts").textContent =
        data.activeContracts || 0;
    }

    if (document.getElementById("statPendingInvoices")) {
      document.getElementById("statPendingInvoices").textContent =
        data.pendingInvoices || 0;
    }

    if (document.getElementById("statClients")) {
      document.getElementById("statClients").textContent = data.clients || 0;
    }

    
    if (document.getElementById("statNewRequests")) {
      document.getElementById("statNewRequests").textContent =
        data.newRequests || 0;
    }

    if (document.getElementById("statTotalRequests")) {
      document.getElementById("statTotalRequests").textContent =
        data.totalRequests || 0;
    }

    if (document.getElementById("statInProgressRequests")) {
      document.getElementById("statInProgressRequests").textContent =
        data.inProgressRequests || 0;
    }

    if (document.getElementById("statCompletedRequests")) {
      document.getElementById("statCompletedRequests").textContent =
        data.completedRequests || 0;
    }

    
    if (document.getElementById("statServices")) {
      document.getElementById("statServices").textContent = data.services || 0;
    }

    if (document.getElementById("statContractsCount")) {
      document.getElementById("statContractsCount").textContent =
        data.totalContracts || 0;
    }

    if (document.getElementById("statInvoicesCount")) {
      document.getElementById("statInvoicesCount").textContent =
        data.totalInvoices || 0;
    }

    
    loadRecentRequests();

    
    loadUpcomingDeadlines();

    showNotification("Данные дашборда обновлены", "success");
  } catch (error) {
    console.error("Ошибка дашборда:", error);
    showNotification("Ошибка загрузки данных дашборда", "error");
  }
}

async function loadRecentRequests() {
  try {
    const response = await fetch(`${API_BASE_URL}/requests?limit=5`);
    const requests = await response.json();

    const container = document.getElementById("recentRequests");
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-inbox"></i><p>Нет заявок</p></div>';
      return;
    }

    let html = "";
    requests.slice(0, 5).forEach((req) => {
      const date = new Date(req.created_at).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });

      let statusText = "";
      let statusClass = "";
      switch (req.status) {
        case "new":
          statusText = "Новая";
          statusClass = "new";
          break;
        case "in_progress":
          statusText = "В работе";
          statusClass = "progress";
          break;
        case "completed":
          statusText = "Завершена";
          statusClass = "completed";
          break;
        case "cancelled":
          statusText = "Отклонена";
          statusClass = "cancelled";
          break;
        default:
          statusText = req.status;
          statusClass = "new";
      }

      html += `
        <div class="recent-item" onclick="viewRequestDetails(${req.id})" style="cursor: pointer;">
          <div class="recent-info">
            <h4>${req.full_name || "Клиент"}</h4>
            <p>${req.request_number || "Б/Н"} • ${date}</p>
          </div>
          <span class="recent-status ${statusClass}">${statusText}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error("Ошибка загрузки последних заявок:", error);
    const container = document.getElementById("recentRequests");
    if (container) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
  }
}

async function loadUpcomingDeadlines() {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts?status=active`);
    const contracts = await response.json();

    const container = document.getElementById("upcomingDeadlines");
    if (!container) return;

    if (!contracts || contracts.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Нет ближайших дедлайнов</p></div>';
      return;
    }

    const today = new Date();
    const upcoming = contracts
      .filter((c) => c.end_date && new Date(c.end_date) > today)
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
      .slice(0, 4);

    if (upcoming.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Нет ближайших дедлайнов</p></div>';
      return;
    }

    let html = "";
    upcoming.forEach((contract) => {
      const endDate = new Date(contract.end_date);
      const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      const warningClass =
        daysLeft <= 3 ? "danger" : daysLeft <= 7 ? "warning" : "";

      html += `
        <div class="upcoming-item ${warningClass}" onclick="viewContract(${contract.id})">
          <div class="recent-info">
            <h4>${contract.contract_number}</h4>
            <p>${contract.company_name || "Клиент"} • осталось ${daysLeft} дн.</p>
          </div>
          <i class="fas ${daysLeft <= 3 ? "fa-exclamation-triangle text-danger" : "fa-calendar-alt"}"></i>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error("Ошибка загрузки дедлайнов:", error);
    const container = document.getElementById("upcomingDeadlines");
    if (container) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Ошибка загрузки</p></div>';
    }
  }
}



async function loadRequests() {
  try {
    const tableBody = document.getElementById("requestsTable");
    if (!tableBody) return;

    tableBody.innerHTML =
      '<tr><td colspan="7" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка заявок...</td></tr>';

    const statusFilter =
      document.getElementById("requestStatusFilter")?.value || "";
    let url = `${API_BASE_URL}/requests`;
    if (statusFilter) url += `?status=${statusFilter}`;

    const response = await fetch(url);
    const requests = await response.json();

    tableBody.innerHTML = "";

    if (requests.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i><p>Заявки не найдены</p></td></tr>`;
      return;
    }

    requests.forEach((req) => {
      const row = document.createElement("tr");
      let statusClass = "pending";
      let statusText = "Новая";

      switch (req.status) {
        case "new":
          statusClass = "pending";
          statusText = "Новая";
          break;
        case "in_progress":
          statusClass = "active";
          statusText = "В работе";
          break;
        case "completed":
          statusClass = "paid";
          statusText = "Завершена";
          break;
        case "cancelled":
          statusClass = "cancelled";
          statusText = "Отклонена";
          break;
      }

      let servicesCount = 0;
      try {
        if (req.selected_services) {
          if (typeof req.selected_services === "string") {
            const selectedServices = JSON.parse(req.selected_services);
            servicesCount = selectedServices.length;
          } else if (Array.isArray(req.selected_services)) {
            servicesCount = req.selected_services.length;
          }
        }
      } catch (e) {
        console.log("Ошибка парсинга selected_services:", e);
      }

      const totalAmount = req.total_amount ? parseFloat(req.total_amount) : 0;

      row.innerHTML = `
                <td><strong>${req.request_number || "Б/Н"}</strong></td>
                <td>
                    ${req.full_name || "Не указано"}<br>
                    <small>${req.company_name ? req.company_name.substring(0, 30) + (req.company_name.length > 30 ? "..." : "") : ""}</small>
                </td>
                <td>
                    ${req.phone || "Не указан"}<br>
                    <small>${req.email || "Не указан"}</small>
                </td>
                <td>
                    <span class="badge">${servicesCount} ${getServicesWord(servicesCount)}</span><br>
                    <small>${formatCurrency(totalAmount)}</small>
                </td>
                <td>${formatDate(req.created_at)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" onclick="viewRequestDetails(${req.id})" title="Просмотреть детали">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action edit" onclick="openStatusModal(${req.id}, '${req.status}', '${req.admin_notes || ""}')" title="Изменить статус">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка загрузки заявок:", error);
    showNotification("Ошибка загрузки заявок", "error");
  }
}

function getServicesWord(count) {
  if (count % 10 === 1 && count % 100 !== 11) {
    return "услуга";
  } else if (
    [2, 3, 4].includes(count % 10) &&
    ![12, 13, 14].includes(count % 100)
  ) {
    return "услуги";
  } else {
    return "услуг";
  }
}

function openStatusModal(id, currentStatus, notes) {
  document.getElementById("currentRequestId").value = id;
  document.getElementById("requestStatusSelect").value = currentStatus;
  document.getElementById("requestAdminNotes").value = notes || "";
  showModal("requestStatusModal");
}

async function updateRequestStatus() {
  const id = document.getElementById("currentRequestId").value;
  const status = document.getElementById("requestStatusSelect").value;
  const notes = document.getElementById("requestAdminNotes").value;

  try {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: notes }),
    });

    const result = await response.json();
    if (response.ok) {
      showNotification("Статус заявки обновлен", "success");
      closeModal("requestStatusModal");
      loadRequests();
    } else {
      throw new Error(result.error || "Ошибка обновления");
    }
  } catch (error) {
    console.error("Ошибка обновления:", error);
    showNotification("Ошибка обновления статуса", "error");
  }
}

async function createContractFromRequest() {
  const requestId = document.getElementById("currentRequestId").value;

  if (!requestId) {
    showNotification("ID заявки не найден", "error");
    return;
  }

  try {
    showNotification("Создание договора...", "info");

    const response = await fetch(`${API_BASE_URL}/requests/${requestId}`);

    if (!response.ok) {
      throw new Error(`Ошибка загрузки заявки: ${response.status}`);
    }

    const request = await response.json();

    if (!request || !request.id) {
      throw new Error("Не удалось загрузить данные заявки");
    }

    let clientId = null;

    if (request.email) {
      const clientsResponse = await fetch(
        `${API_BASE_URL}/clients?search=${encodeURIComponent(request.email)}`,
      );
      const clients = await clientsResponse.json();

      if (clients && clients.length > 0) {
        clientId = clients[0].id;
      }
    }

    if (!clientId) {
      const newClient = {
        company_name: request.company_name || `Клиент от ${request.full_name}`,
        contact_person: request.full_name || "",
        phone: request.phone || "",
        email: request.email || "",
      };

      const clientResponse = await fetch(`${API_BASE_URL}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });

      const clientResult = await clientResponse.json();

      if (!clientResult.success) {
        throw new Error(
          "Ошибка создания клиента: " +
            (clientResult.error || "Неизвестная ошибка"),
        );
      }
      clientId = clientResult.data.id;
    }

    const date = new Date();
    const year = date.getFullYear();
    const randomNum = String(Math.floor(Math.random() * 900) + 100);
    const contractNumber = `ДОГ-${year}-${randomNum}`;

    const today = date.toISOString().split("T")[0];

    let totalAmount = 0;
    try {
      if (request.selected_services) {
        let selectedServices = [];
        if (typeof request.selected_services === "string") {
          selectedServices = JSON.parse(request.selected_services);
        } else if (Array.isArray(request.selected_services)) {
          selectedServices = request.selected_services;
        }

        selectedServices.forEach((s) => {
          if (s.subtotal) {
            totalAmount += Number(s.subtotal);
          } else if (s.price && s.quantity) {
            totalAmount += Number(s.price) * Number(s.quantity);
          }
        });
      }
    } catch (e) {
      console.error("Ошибка расчета суммы:", e);
    }

    if (totalAmount === 0 && request.total_amount) {
      totalAmount = Number(request.total_amount);
    }

    const contractData = {
      contract_number: contractNumber,
      client_id: clientId,
      contract_date: today,
      start_date: today,
      total_amount: totalAmount,
      status: "active",
    };

    const contractResponse = await fetch(`${API_BASE_URL}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractData),
    });

    const contractResult = await contractResponse.json();

    if (contractResult.success) {
      showNotification(`Договор ${contractNumber} создан`, "success");

      setTimeout(() => {
        createInvoiceFromContract(contractResult.data.id, totalAmount);
      }, 500);

      closeModal("requestStatusModal");
      loadContracts();
      loadDashboardData();
    } else {
      throw new Error(contractResult.error || "Ошибка создания договора");
    }
  } catch (error) {
    console.error("Ошибка создания договора:", error);
    showNotification("Ошибка создания договора: " + error.message, "error");
  }
}

async function createInvoiceFromContract(contractId, amount) {
  try {
    console.log("Создание счета для договора ID:", contractId);

    const contractResponse = await fetch(
      `${API_BASE_URL}/contracts/${contractId}`,
    );

    if (!contractResponse.ok) {
      throw new Error(`Ошибка загрузки договора: ${contractResponse.status}`);
    }

    const contract = await contractResponse.json();
    console.log("Данные договора:", contract);

    if (!contract.success) throw new Error("Договор не найден");

    const date = new Date();
    const year = date.getFullYear();
    const randomNum = String(Math.floor(Math.random() * 900) + 100).padStart(
      3,
      "0",
    );
    const invoiceNumber = `СЧ-${year}-${randomNum}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoiceData = {
      invoice_number: invoiceNumber,
      contract_id: contractId,
      invoice_date: date.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      amount: amount,
      total_amount: amount,
      status: "pending",
      notes: "Автоматически создан из заявки",
    };

    const invoiceResponse = await fetch(`${API_BASE_URL}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    const invoiceResult = await invoiceResponse.json();
    console.log("Результат создания счета:", invoiceResult);

    if (invoiceResult.success) {
      showNotification(`Счет ${invoiceNumber} создан`, "success");
      loadInvoices();
    } else {
      throw new Error(invoiceResult.error || "Ошибка создания счета");
    }
  } catch (error) {
    console.error("Ошибка создания счета:", error);
    showNotification("Ошибка создания счета: " + error.message, "warning");
  }
}

async function viewRequestDetails(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`);
    const request = await response.json();

    let servicesHtml = "";
    let totalAmount = 0;
    let selectedServices = [];

    try {
      if (request.selected_services) {
        if (typeof request.selected_services === "string") {
          selectedServices = JSON.parse(request.selected_services);
        } else if (Array.isArray(request.selected_services)) {
          selectedServices = request.selected_services;
        }
      }

      servicesHtml = selectedServices
        .map((s) => {
          const price = Number(s.price) || 0;
          const quantity = Number(s.quantity) || 1;
          const subtotal = Number(s.subtotal) || price * quantity;
          totalAmount += subtotal;

          return `
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--border-color);">
                        <span>
                            <strong>${s.service_name || "Услуга"}</strong><br>
                            <small>Количество: ${quantity} × ${formatCurrency(price)}</small>
                        </span>
                        <span><strong>${formatCurrency(subtotal)}</strong></span>
                    </div>
                `;
        })
        .join("");

      if (servicesHtml === "") {
        servicesHtml = '<p class="empty-state">Нет данных об услугах</p>';
      }
    } catch (e) {
      console.error("Ошибка парсинга услуг:", e);
      servicesHtml = '<p class="empty-state">Ошибка загрузки услуг</p>';
    }

    if (totalAmount === 0 && request.total_amount) {
      totalAmount = parseFloat(request.total_amount);
    }

    let statusText = "";
    let statusClass = "";
    switch (request.status) {
      case "new":
        statusText = "Новая";
        statusClass = "pending";
        break;
      case "in_progress":
        statusText = "В работе";
        statusClass = "active";
        break;
      case "completed":
        statusText = "Завершена";
        statusClass = "paid";
        break;
      case "cancelled":
        statusText = "Отклонена";
        statusClass = "cancelled";
        break;
      default:
        statusText = request.status;
        statusClass = "pending";
    }

    const modalHtml = `
            <div class="modal-overlay active" id="viewRequestModal" style="display: flex;">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-signature"></i> Заявка ${request.request_number || "Б/Н"}</h3>
                        <button class="btn-close" onclick="document.getElementById('viewRequestModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <p><strong>ФИО:</strong> ${request.full_name || "Не указано"}</p>
                                <p><strong>Компания:</strong> ${request.company_name || "Не указана"}</p>
                                <p><strong>Телефон:</strong> ${request.phone || "Не указан"}</p>
                                <p><strong>Email:</strong> ${request.email || "Не указан"}</p>
                            </div>
                            <div>
                                <p><strong>Дата заявки:</strong> ${formatDateTime(request.created_at)}</p>
                                <p><strong>Желаемая дата:</strong> ${request.preferred_date ? formatDate(request.preferred_date) : "Не указана"}</p>
                                <p><strong>Статус:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                            </div>
                        </div>
                        
                        <h4>Выбранные услуги:</h4>
                        <div style="background: var(--bg-secondary); padding: 15px; border-radius: var(--border-radius); margin-bottom: 20px;">
                            ${servicesHtml}
                            <div style="display: flex; justify-content: space-between; padding: 15px 0 5px; margin-top: 10px; border-top: 2px solid var(--border-color); font-weight: bold; font-size: 1.2rem;">
                                <span>ИТОГО:</span>
                                <span>${formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                        
                        ${
                          request.admin_notes
                            ? `
                            <div>
                                <p><strong>Комментарий администратора:</strong></p>
                                <p style="background: var(--bg-secondary); padding: 10px; border-radius: var(--border-radius);">${request.admin_notes}</p>
                            </div>
                        `
                            : ""
                        }
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('viewRequestModal').remove()">Закрыть</button>
                        <button class="btn btn-primary" onclick="document.getElementById('viewRequestModal').remove(); openStatusModal(${request.id}, '${request.status}', '${request.admin_notes || ""}');">Изменить статус</button>
                    </div>
                </div>
            </div>
        `;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    console.error("Ошибка загрузки деталей заявки:", error);
    showNotification("Ошибка загрузки деталей заявки", "error");
  }
}

async function loadServices() {
  try {
    const tableBody = document.getElementById("servicesTable");
    if (!tableBody) return;

    tableBody.innerHTML =
      '<tr><td colspan="6" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const search = document.getElementById("serviceSearch")?.value || "";
    const activeOnly = document.getElementById("showActiveOnly")?.checked;

    let url = `${API_BASE_URL}/services`;
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (activeOnly) params.append("active", "true");

    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url);
    const services = await response.json();

    tableBody.innerHTML = "";

    if (services.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fas fa-inbox"></i><p>Услуги не найдены</p></td></tr>`;
      return;
    }

    services.forEach((service) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td><strong>${service.service_code}</strong></td>
                <td>${service.service_name}${service.description ? `<br><small>${service.description.substring(0, 50)}${service.description.length > 50 ? "..." : ""}</small>` : ""}</td>
                <td>${service.unit}</td>
                <td><strong>${formatCurrency(service.base_price)}</strong></td>
                <td><span class="status-badge ${service.is_active ? "active" : "inactive"}">${service.is_active ? "Активна" : "Неактивна"}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit" onclick="editService(${service.id})" title="Редактировать"><i class="fas fa-edit"></i></button>
                        <button class="btn-action delete" onclick="deleteService(${service.id})" title="Удалить"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });

    const countElement = document.getElementById("servicesCount");
    if (countElement) {
      countElement.textContent = `${services.length} услуг`;
    }
  } catch (error) {
    console.error("Ошибка загрузки услуг:", error);
    showNotification("Ошибка загрузки услуг", "error");
  }
}

async function saveService(event) {
  event.preventDefault();

  const serviceId = document.getElementById("serviceId").value;
  const serviceData = {
    service_code: document.getElementById("serviceCode").value,
    service_name: document.getElementById("serviceName").value,
    description: document.getElementById("serviceDescription").value,
    unit: document.getElementById("serviceUnit").value,
    base_price: parseFloat(document.getElementById("servicePrice").value),
    is_active: document.getElementById("serviceActive").checked,
  };

  try {
    const url = serviceId
      ? `${API_BASE_URL}/services/${serviceId}`
      : `${API_BASE_URL}/services`;
    const method = serviceId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("serviceModal");
      loadServices();
      loadDashboardData();
      showNotification(
        serviceId ? "Услуга обновлена" : "Услуга добавлена",
        "success",
      );
      document.getElementById("serviceForm").reset();
      document.getElementById("serviceId").value = "";
      document.getElementById("modalServiceTitle").innerHTML =
        '<i class="fas fa-concierge-bell"></i> Добавить новую услугу';
      document.getElementById("serviceActive").checked = true;
    } else {
      throw new Error(result.error || "Ошибка сохранения");
    }
  } catch (error) {
    console.error("Ошибка сохранения услуги:", error);
    showNotification("Ошибка сохранения услуги", "error");
  }
}

async function editService(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/services/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const service = result.data;

    document.getElementById("serviceId").value = service.id;
    document.getElementById("serviceCode").value = service.service_code;
    document.getElementById("serviceName").value = service.service_name;
    document.getElementById("serviceDescription").value =
      service.description || "";
    document.getElementById("serviceUnit").value = service.unit;
    document.getElementById("servicePrice").value = service.base_price;
    document.getElementById("serviceActive").checked = service.is_active;

    document.getElementById("modalServiceTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать услугу';
    showModal("serviceModal");
  } catch (error) {
    console.error("Ошибка загрузки услуги:", error);
    showNotification("Ошибка загрузки услуги", "error");
  }
}

async function deleteService(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Услуга удалена", "success");
        loadServices();
        loadDashboardData();
      } else {
        throw new Error(result.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Ошибка удаления услуги:", error);
      showNotification("Ошибка удаления услуги", "error");
    }
  }, "Удалить эту услугу?");
}

function searchServices() {
  clearTimeout(window.searchTimeout);
  window.searchTimeout = setTimeout(loadServices, 500);
}

function filterServices() {
  loadServices();
}

async function loadClients() {
  try {
    const tableBody = document.getElementById("clientsTable");
    if (!tableBody) return;

    tableBody.innerHTML =
      '<tr><td colspan="6" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const search = document.getElementById("clientSearch")?.value || "";
    let url = `${API_BASE_URL}/clients`;
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const response = await fetch(url);
    const clients = await response.json();

    tableBody.innerHTML = "";

    if (clients.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fas fa-users"></i><p>Клиенты не найдены</p></td></tr>`;
      return;
    }

    clients.forEach((client) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td><strong>${client.company_name || "Без названия"}</strong></td>
                <td>${client.contact_person || "-"}</td>
                <td>${client.tax_number || "-"}</td>
                <td>${client.phone || "-"}</td>
                <td>${client.email || "-"}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit" onclick="editClient(${client.id})" title="Редактировать"><i class="fas fa-edit"></i></button>
                        <button class="btn-action delete" onclick="deleteClient(${client.id})" title="Удалить"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка загрузки клиентов:", error);
    showNotification("Ошибка загрузки клиентов", "error");
  }
}

async function saveClient(event) {
  event.preventDefault();

  const clientId = document.getElementById("clientId").value;
  const clientData = {
    company_name: document.getElementById("clientCompany").value,
    contact_person: document.getElementById("clientContact").value,
    tax_number: document.getElementById("clientINN").value,
    phone: document.getElementById("clientPhone").value,
    email: document.getElementById("clientEmail").value,
    legal_address: document.getElementById("clientAddress").value,
    bank_details: document.getElementById("clientBank").value,
  };

  try {
    const url = clientId
      ? `${API_BASE_URL}/clients/${clientId}`
      : `${API_BASE_URL}/clients`;
    const method = clientId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clientData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("clientModal");
      loadClients();
      loadDashboardData();
      showNotification(
        clientId ? "Клиент обновлен" : "Клиент добавлен",
        "success",
      );
      document.getElementById("clientForm").reset();
      document.getElementById("clientId").value = "";
      document.getElementById("modalClientTitle").innerHTML =
        '<i class="fas fa-user-plus"></i> Добавить нового клиента';
    } else {
      throw new Error(result.error || "Ошибка сохранения");
    }
  } catch (error) {
    console.error("Ошибка сохранения клиента:", error);
    showNotification("Ошибка сохранения клиента", "error");
  }
}

async function editClient(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/clients/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const client = result.data;

    document.getElementById("clientId").value = client.id;
    document.getElementById("clientCompany").value = client.company_name || "";
    document.getElementById("clientContact").value =
      client.contact_person || "";
    document.getElementById("clientINN").value = client.tax_number || "";
    document.getElementById("clientPhone").value = client.phone || "";
    document.getElementById("clientEmail").value = client.email || "";
    document.getElementById("clientAddress").value = client.legal_address || "";
    document.getElementById("clientBank").value = client.bank_details || "";

    document.getElementById("modalClientTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать клиента';
    showModal("clientModal");
  } catch (error) {
    console.error("Ошибка загрузки клиента:", error);
    showNotification("Ошибка загрузки клиента", "error");
  }
}

async function deleteClient(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Клиент удален", "success");
        loadClients();
        loadDashboardData();
      } else {
        throw new Error(result.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Ошибка удаления клиента:", error);
      showNotification("Ошибка удаления клиента", "error");
    }
  }, "Удалить этого клиента?");
}

function searchClients() {
  clearTimeout(window.clientSearchTimeout);
  window.clientSearchTimeout = setTimeout(loadClients, 500);
}

async function loadPriceLists() {
  try {
    const container = document.getElementById("priceListsContainer");
    if (!container) return;

    container.innerHTML =
      '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка прайс-листов...</div>';

    const response = await fetch(`${API_BASE_URL}/price-lists`);
    const priceLists = await response.json();

    container.innerHTML = "";

    if (priceLists.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Прайс-листы не найдены</p><button class="btn btn-primary mt-2" onclick="showModal(\'priceListModal\')">Создать первый</button></div>';
      return;
    }

    priceLists.forEach((list) => {
      const card = document.createElement("div");
      card.className = "price-list-card";
      card.innerHTML = `
                <div class="price-list-header">
                    <h4>${list.price_list_name}</h4>
                    <span class="status-badge ${list.is_active ? "active" : "inactive"}">${list.is_active ? "Активен" : "Неактивен"}</span>
                </div>
                <div class="price-list-dates">
                    <div><i class="fas fa-calendar-alt"></i> с ${formatDate(list.valid_from)}</div>
                    ${list.valid_to ? `<div><i class="fas fa-calendar-times"></i> до ${formatDate(list.valid_to)}</div>` : ""}
                </div>
                <div class="price-list-description">
                    ${list.description || "Нет описания"}
                </div>
                <div class="price-list-actions">
                    <button class="btn-action edit" onclick="editPriceList(${list.id})" title="Редактировать"><i class="fas fa-edit"></i></button>
                    <button class="btn-action delete" onclick="deletePriceList(${list.id})" title="Удалить"><i class="fas fa-trash"></i></button>
                    <button class="btn-action view" onclick="viewPriceList(${list.id})" title="Просмотреть"><i class="fas fa-eye"></i></button>
                </div>
            `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Ошибка загрузки прайс-листов:", error);
    showNotification("Ошибка загрузки прайс-листов", "error");
  }
}

async function savePriceList(event) {
  event.preventDefault();

  const priceListId = document.getElementById("priceListId").value;
  const priceListData = {
    price_list_name: document.getElementById("priceListName").value,
    description: document.getElementById("priceListDescription").value,
    valid_from: document.getElementById("priceListValidFrom").value,
    valid_to: document.getElementById("priceListValidTo").value || null,
    is_active: document.getElementById("priceListActive").checked,
  };

  try {
    const url = priceListId
      ? `${API_BASE_URL}/price-lists/${priceListId}`
      : `${API_BASE_URL}/price-lists`;
    const method = priceListId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(priceListData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      const newPriceListId = result.data.id;

      const items = [];
      document
        .querySelectorAll("#priceListItems .price-list-item")
        .forEach((item) => {
          const serviceSelect = item.querySelector(".item-service");
          const priceInput = item.querySelector(".item-price");

          if (
            serviceSelect &&
            serviceSelect.value &&
            priceInput &&
            priceInput.value
          ) {
            items.push({
              service_id: parseInt(serviceSelect.value),
              price: parseFloat(priceInput.value),
            });
          }
        });

      if (items.length > 0) {
        await fetch(
          `${API_BASE_URL}/price-list-items/${newPriceListId || priceListId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          },
        );
      }

      closeModal("priceListModal");
      loadPriceLists();
      showNotification(
        result.message ||
          (priceListId ? "Прайс-лист обновлен" : "Прайс-лист создан"),
        "success",
      );

      document.getElementById("priceListForm").reset();
      document.getElementById("priceListId").value = "";
      document.getElementById("priceListItems").innerHTML = "";
      document.getElementById("modalPriceListTitle").innerHTML =
        '<i class="fas fa-file-invoice-dollar"></i> Создать прайс-лист';

      const today = new Date().toISOString().split("T")[0];
      document.getElementById("priceListValidFrom").value = today;
    } else {
      throw new Error(result.error || "Ошибка сохранения");
    }
  } catch (error) {
    console.error("Ошибка сохранения прайс-листа:", error);
    showNotification("Ошибка сохранения прайс-листа", "error");
  }
}

async function editPriceList(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/price-lists/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const priceList = result.data;

    document.getElementById("priceListId").value = priceList.id;
    document.getElementById("priceListName").value =
      priceList.price_list_name || "";
    document.getElementById("priceListDescription").value =
      priceList.description || "";
    document.getElementById("priceListValidFrom").value = priceList.valid_from;
    document.getElementById("priceListValidTo").value =
      priceList.valid_to || "";
    document.getElementById("priceListActive").checked = priceList.is_active;

    const itemsResponse = await fetch(`${API_BASE_URL}/price-list-items/${id}`);
    const items = await itemsResponse.json();

    const container = document.getElementById("priceListItems");
    container.innerHTML = "";

    await loadServicesForPriceList();

    if (items && items.length > 0) {
      items.forEach((item) => {
        addPriceListItemWithData(item.service_id, item.price);
      });
    }

    document.getElementById("modalPriceListTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать прайс-лист';
    showModal("priceListModal");
  } catch (error) {
    console.error("Ошибка загрузки прайс-листа:", error);
    showNotification("Ошибка загрузки прайс-листа", "error");
  }
}

async function deletePriceList(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/price-lists/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Прайс-лист удален", "success");
        loadPriceLists();
      } else {
        throw new Error(result.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Ошибка удаления прайс-листа:", error);
      showNotification("Ошибка удаления прайс-листа", "error");
    }
  }, "Удалить этот прайс-лист?");
}

async function viewPriceList(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/price-lists/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const priceList = result.data;

    const itemsResponse = await fetch(`${API_BASE_URL}/price-list-items/${id}`);
    const items = await itemsResponse.json();

    let itemsHtml = "";
    if (items.length > 0) {
      items.forEach((item) => {
        itemsHtml += `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--border-color);">
                        <span>${item.service_name}</span>
                        <span><strong>${formatCurrency(item.price)}</strong></span>
                    </div>
                `;
      });
    } else {
      itemsHtml = '<p class="empty-state">Нет позиций в прайс-листе</p>';
    }

    const modalHtml = `
            <div class="modal-overlay active" id="viewPriceListModal" style="display: flex;">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-invoice-dollar"></i> ${priceList.price_list_name}</h3>
                        <button class="btn-close" onclick="document.getElementById('viewPriceListModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px;">
                            <p><strong>Описание:</strong> ${priceList.description || "Нет описания"}</p>
                            <p><strong>Действует с:</strong> ${formatDate(priceList.valid_from)}</p>
                            ${priceList.valid_to ? `<p><strong>Действует до:</strong> ${formatDate(priceList.valid_to)}</p>` : ""}
                            <p><strong>Статус:</strong> <span class="status-badge ${priceList.is_active ? "active" : "inactive"}">${priceList.is_active ? "Активен" : "Неактивен"}</span></p>
                        </div>
                        
                        <h4>Позиции прайс-листа:</h4>
                        <div style="background: var(--bg-secondary); padding: 15px; border-radius: var(--border-radius);">
                            ${itemsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('viewPriceListModal').remove()">Закрыть</button>
                        <button class="btn btn-primary" onclick="document.getElementById('viewPriceListModal').remove(); editPriceList(${priceList.id});">Редактировать</button>
                    </div>
                </div>
            </div>
        `;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    console.error("Ошибка загрузки прайс-листа:", error);
    showNotification("Ошибка загрузки прайс-листа", "error");
  }
}

async function loadServicesForPriceList() {
  try {
    const response = await fetch(`${API_BASE_URL}/services?active=true`);
    servicesForPriceList = await response.json();
  } catch (error) {
    console.error("Ошибка загрузки услуг:", error);
  }
}

function addPriceListItem() {
  addPriceListItemWithData(null, null);
}

function addPriceListItemWithData(serviceId, price) {
  const container = document.getElementById("priceListItems");
  const newItem = document.createElement("div");
  newItem.className = "price-list-item";
  newItem.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <div style="flex: 2;">
                <select class="item-service" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                    <option value="">Выберите услугу</option>
                </select>
            </div>
            <div style="flex: 1;">
                <input type="number" class="item-price" step="0.01" min="0" placeholder="Цена" value="${price || ""}" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
  container.appendChild(newItem);

  const select = newItem.querySelector(".item-service");
  loadServicesForSelect(select, serviceId);
}

async function loadServicesForSelect(selectElement, selectedServiceId = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/services?active=true`);
    const services = await response.json();

    let options = '<option value="">Выберите услугу</option>';
    services.forEach((s) => {
      const selected =
        selectedServiceId && s.id == selectedServiceId ? "selected" : "";
      options += `<option value="${s.id}" data-price="${s.base_price}" ${selected}>${s.service_code} - ${s.service_name}</option>`;
    });

    selectElement.innerHTML = options;

    selectElement.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      const priceInput =
        this.closest("div").parentElement.querySelector(".item-price");
      if (selectedOption && selectedOption.dataset.price && !priceInput.value) {
        priceInput.value = selectedOption.dataset.price;
      }
    });

    if (selectedServiceId) {
      const selectedOption = selectElement.querySelector(
        `option[value="${selectedServiceId}"]`,
      );
      if (selectedOption) {
        const priceInput = selectElement
          .closest("div")
          .parentElement.querySelector(".item-price");
        if (priceInput && !priceInput.value) {
          priceInput.value = selectedOption.dataset.price;
        }
      }
    }
  } catch (error) {
    console.error("Ошибка загрузки услуг:", error);
  }
}

async function loadContracts() {
  try {
    const tableBody = document.getElementById("contractsTable");
    if (!tableBody) return;

    tableBody.innerHTML =
      '<tr><td colspan="7" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const statusFilter =
      document.getElementById("contractStatusFilter")?.value || "";
    let url = `${API_BASE_URL}/contracts`;
    if (statusFilter) url += `?status=${statusFilter}`;

    const response = await fetch(url);
    const contracts = await response.json();

    tableBody.innerHTML = "";

    if (contracts.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fas fa-file-contract"></i><p>Договоры не найдены</p></td></tr>`;
      return;
    }

    contracts.forEach((contract) => {
      const endDate = contract.end_date
        ? formatDate(contract.end_date)
        : "Бессрочный";
      let statusText =
        contract.status === "active"
          ? "Активен"
          : contract.status === "suspended"
            ? "Приостановлен"
            : "Завершен";
      let statusClass =
        contract.status === "active"
          ? "active"
          : contract.status === "suspended"
            ? "pending"
            : "cancelled";

      const row = document.createElement("tr");
      row.innerHTML = `
                <td><strong>${contract.contract_number}</strong></td>
                <td>${contract.company_name || "Без названия"}</td>
                <td>${formatDate(contract.contract_date)}</td>
                <td>${endDate}</td>
                <td><strong>${formatCurrency(contract.total_amount || 0)}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" onclick="viewContract(${contract.id})" title="Просмотреть"><i class="fas fa-eye"></i></button>
                        <button class="btn-action edit" onclick="editContract(${contract.id})" title="Редактировать"><i class="fas fa-edit"></i></button>
                        <button class="btn-action delete" onclick="deleteContract(${contract.id})" title="Удалить"><i class="fas fa-trash"></i></button>
                        <button class="btn-action success" onclick="createInvoiceFromContractDirect(${contract.id})" title="Выставить счет"><i class="fas fa-receipt"></i></button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка загрузки договоров:", error);
    showNotification("Ошибка загрузки договоров", "error");
  }
}

async function saveContract(event) {
  event.preventDefault();

  const contractId = document.getElementById("contractId").value;
  const contractData = {
    contract_number: document.getElementById("contractNumber").value,
    client_id: parseInt(document.getElementById("contractClient").value),
    price_list_id: document.getElementById("contractPriceList").value
      ? parseInt(document.getElementById("contractPriceList").value)
      : null,
    contract_date: document.getElementById("contractDate").value,
    start_date: document.getElementById("contractStartDate").value,
    end_date: document.getElementById("contractEndDate").value || null,
    total_amount:
      parseFloat(document.getElementById("contractAmount").value) || 0,
    status: document.getElementById("contractStatus").value,
  };

  try {
    const url = contractId
      ? `${API_BASE_URL}/contracts/${contractId}`
      : `${API_BASE_URL}/contracts`;
    const method = contractId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("contractModal");
      loadContracts();
      loadDashboardData();
      showNotification(
        contractId ? "Договор обновлен" : "Договор создан",
        "success",
      );
      document.getElementById("contractForm").reset();
      document.getElementById("contractId").value = "";
      document.getElementById("modalContractTitle").innerHTML =
        '<i class="fas fa-file-contract"></i> Добавить договор';
    } else {
      throw new Error(result.error || "Ошибка создания договора");
    }
  } catch (error) {
    console.error("Ошибка создания договора:", error);
    showNotification("Ошибка создания договора", "error");
  }
}

async function editContract(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const contract = result.data;

    document.getElementById("contractId").value = contract.id;
    document.getElementById("contractNumber").value = contract.contract_number;
    document.getElementById("contractDate").value = contract.contract_date;
    document.getElementById("contractStartDate").value = contract.start_date;
    document.getElementById("contractEndDate").value = contract.end_date || "";
    document.getElementById("contractAmount").value =
      contract.total_amount || 0;
    document.getElementById("contractStatus").value = contract.status;

    await loadClientsForContractSelect();
    await loadPriceListsForContractSelect();

    setTimeout(() => {
      document.getElementById("contractClient").value = contract.client_id;
      if (contract.price_list_id) {
        document.getElementById("contractPriceList").value =
          contract.price_list_id;
      }
    }, 100);

    document.getElementById("modalContractTitle").innerHTML =
      '<i class="fas fa-edit"></i> Редактировать договор';
    showModal("contractModal");
  } catch (error) {
    console.error("Ошибка загрузки договора:", error);
    showNotification("Ошибка загрузки договора", "error");
  }
}

async function deleteContract(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/contracts/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Договор удален", "success");
        loadContracts();
        loadDashboardData();
      } else {
        throw new Error(result.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Ошибка удаления договора:", error);
      showNotification("Ошибка удаления договора", "error");
    }
  }, "Удалить этот договор?");
}

async function viewContract(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const contract = result.data;

    const clientResponse = await fetch(
      `${API_BASE_URL}/clients/${contract.client_id}`,
    );
    const clientResult = await clientResponse.json();
    const client = clientResult.success ? clientResult.data : null;

    const modalHtml = `
            <div class="modal-overlay active" id="viewContractModal" style="display: flex;">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3><i class="fas fa-file-contract"></i> Договор ${contract.contract_number}</h3>
                        <button class="btn-close" onclick="document.getElementById('viewContractModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <p><strong>Клиент:</strong> ${client ? client.company_name : "Неизвестно"}</p>
                                <p><strong>Контактное лицо:</strong> ${client ? client.contact_person || "-" : "-"}</p>
                                <p><strong>Телефон:</strong> ${client ? client.phone || "-" : "-"}</p>
                            </div>
                            <div>
                                <p><strong>Дата договора:</strong> ${formatDate(contract.contract_date)}</p>
                                <p><strong>Дата начала:</strong> ${formatDate(contract.start_date)}</p>
                                <p><strong>Дата окончания:</strong> ${contract.end_date ? formatDate(contract.end_date) : "Бессрочный"}</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: var(--bg-secondary); border-radius: var(--border-radius); margin-bottom: 20px;">
                            <span><strong>Сумма договора:</strong></span>
                            <span style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">${formatCurrency(contract.total_amount || 0)}</span>
                        </div>
                        
                        <div>
                            <p><strong>Статус:</strong> 
                                <span class="status-badge ${contract.status === "active" ? "active" : contract.status === "suspended" ? "pending" : "cancelled"}">
                                    ${contract.status === "active" ? "Активен" : contract.status === "suspended" ? "Приостановлен" : "Завершен"}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('viewContractModal').remove()">Закрыть</button>
                        <button class="btn btn-primary" onclick="document.getElementById('viewContractModal').remove(); editContract(${contract.id});">Редактировать</button>
                        <button class="btn btn-success" onclick="document.getElementById('viewContractModal').remove(); createInvoiceFromContractDirect(${contract.id});">Выставить счет</button>
                    </div>
                </div>
            </div>
        `;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    console.error("Ошибка загрузки договора:", error);
    showNotification("Ошибка загрузки договора", "error");
  }
}

async function createInvoiceFromContractDirect(contractId) {
  try {
    const contractResponse = await fetch(
      `${API_BASE_URL}/contracts/${contractId}`,
    );
    const contract = await contractResponse.json();

    if (!contract.success) throw new Error("Договор не найден");

    await loadContractsForInvoiceSelect();

    document.getElementById("invoiceContract").value = contractId;
    document.getElementById("invoiceAmount").value =
      contract.data.total_amount || 0;

    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    document.getElementById("invoiceDate").value = today;
    document.getElementById("invoiceDueDate").value = dueDate
      .toISOString()
      .split("T")[0];

    document.getElementById("invoiceNumber").value =
      `СЧ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

    showModal("invoiceModal");
  } catch (error) {
    console.error("Ошибка создания счета:", error);
    showNotification("Ошибка создания счета", "error");
  }
}

async function loadClientsForContractSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/clients`);
    const clients = await response.json();

    const select = document.getElementById("contractClient");
    select.innerHTML = '<option value="">Выберите клиента</option>';
    clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client.id;
      option.textContent = `${client.company_name} (${client.contact_person || "Нет контакта"})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Ошибка загрузки клиентов:", error);
  }
}

async function loadPriceListsForContractSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/price-lists`);
    const priceLists = await response.json();

    const select = document.getElementById("contractPriceList");
    select.innerHTML = '<option value="">Без прайс-листа</option>';
    priceLists.forEach((list) => {
      if (list.is_active) {
        const option = document.createElement("option");
        option.value = list.id;
        option.textContent = `${list.price_list_name} (с ${formatDate(list.valid_from)})`;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error("Ошибка загрузки прайс-листов:", error);
  }
}

async function loadInvoices() {
  try {
    const tableBody = document.getElementById("invoicesTable");
    if (!tableBody) return;

    tableBody.innerHTML =
      '<tr><td colspan="7" class="loading-state"><i class="fas fa-spinner fa-spin"></i> Загрузка...</td></tr>';

    const statusFilter =
      document.getElementById("invoiceStatusFilter")?.value || "";
    let url = `${API_BASE_URL}/invoices`;
    if (statusFilter) url += `?status=${statusFilter}`;

    const response = await fetch(url);
    const invoices = await response.json();

    tableBody.innerHTML = "";

    if (invoices.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fas fa-receipt"></i><p>Счета не найдены</p></td></tr>`;
      return;
    }

    invoices.forEach((invoice) => {
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      const isOverdue = dueDate < today && invoice.status === "pending";

      let statusText = "";
      let statusClass = "";

      if (invoice.status === "pending") {
        if (isOverdue) {
          statusText = "Просрочен";
          statusClass = "cancelled";
        } else {
          statusText = "Ожидает оплаты";
          statusClass = "pending";
        }
      } else if (invoice.status === "paid") {
        statusText = "Оплачен";
        statusClass = "paid";
      } else if (invoice.status === "cancelled") {
        statusText = "Отменен";
        statusClass = "cancelled";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
                <td><strong>${invoice.invoice_number}</strong></td>
                <td>${invoice.company_name || "Неизвестно"}<br><small>${invoice.contract_number || "Без договора"}</small></td>
                <td>${formatDate(invoice.invoice_date)}</td>
                <td class="${isOverdue ? "text-danger" : ""}">${formatDate(invoice.due_date)}</td>
                <td><strong>${formatCurrency(invoice.total_amount)}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" onclick="viewInvoice(${invoice.id})" title="Просмотреть"><i class="fas fa-eye"></i></button>
                        ${
                          invoice.status === "pending"
                            ? `
                            <button class="btn-action success" onclick="markInvoicePaid(${invoice.id})" title="Отметить оплаченным"><i class="fas fa-check"></i></button>
                            <button class="btn-action edit" onclick="editInvoice(${invoice.id})" title="Редактировать"><i class="fas fa-edit"></i></button>
                        `
                            : ""
                        }
                        <button class="btn-action delete" onclick="deleteInvoice(${invoice.id})" title="Удалить"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Ошибка загрузки счетов:", error);
    showNotification("Ошибка загрузки счетов", "error");
  }
}

async function saveInvoice(event) {
  event.preventDefault();

  const invoiceData = {
    invoice_number: document.getElementById("invoiceNumber").value,
    contract_id: parseInt(document.getElementById("invoiceContract").value),
    invoice_date: document.getElementById("invoiceDate").value,
    due_date: document.getElementById("invoiceDueDate").value,
    amount: parseFloat(document.getElementById("invoiceAmount").value),
    tax_amount: 0,
    total_amount: parseFloat(document.getElementById("invoiceAmount").value),
    status: document.getElementById("invoiceStatus").value,
    notes: document.getElementById("invoiceNotes").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      closeModal("invoiceModal");
      loadInvoices();
      showNotification("Счет создан", "success");
      document.getElementById("invoiceForm").reset();

      const today = new Date().toISOString().split("T")[0];
      document.getElementById("invoiceDate").value = today;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      document.getElementById("invoiceDueDate").value = dueDate
        .toISOString()
        .split("T")[0];
    } else {
      throw new Error(result.error || "Ошибка создания счета");
    }
  } catch (error) {
    console.error("Ошибка создания счета:", error);
    showNotification("Ошибка создания счета", "error");
  }
}

async function editInvoice(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const invoice = result.data;

    await loadContractsForInvoiceSelect();

    document.getElementById("invoiceNumber").value = invoice.invoice_number;
    document.getElementById("invoiceContract").value = invoice.contract_id;
    document.getElementById("invoiceDate").value = invoice.invoice_date;
    document.getElementById("invoiceDueDate").value = invoice.due_date;
    document.getElementById("invoiceAmount").value = invoice.amount;
    document.getElementById("invoiceStatus").value = invoice.status;
    document.getElementById("invoiceNotes").value = invoice.notes || "";

    showModal("invoiceModal");
  } catch (error) {
    console.error("Ошибка загрузки счета:", error);
    showNotification("Ошибка загрузки счета", "error");
  }
}

async function deleteInvoice(id) {
  askDelete(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        showNotification("Счет удален", "success");
        loadInvoices();
      } else {
        throw new Error(result.error || "Ошибка удаления");
      }
    } catch (error) {
      console.error("Ошибка удаления счета:", error);
      showNotification("Ошибка удаления счета", "error");
    }
  }, "Удалить этот счет?");
}

async function viewInvoice(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
    const result = await response.json();

    if (!result.success) throw new Error(result.message);

    const invoice = result.data;

    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const isOverdue = dueDate < today && invoice.status === "pending";

    let statusText = "";
    let statusClass = "";

    if (invoice.status === "pending") {
      if (isOverdue) {
        statusText = "Просрочен";
        statusClass = "cancelled";
      } else {
        statusText = "Ожидает оплаты";
        statusClass = "pending";
      }
    } else if (invoice.status === "paid") {
      statusText = "Оплачен";
      statusClass = "paid";
    } else if (invoice.status === "cancelled") {
      statusText = "Отменен";
      statusClass = "cancelled";
    }

    const modalHtml = `
            <div class="modal-overlay active" id="viewInvoiceModal" style="display: flex;">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3><i class="fas fa-receipt"></i> Счет ${invoice.invoice_number}</h3>
                        <button class="btn-close" onclick="document.getElementById('viewInvoiceModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <p><strong>Клиент:</strong> ${invoice.company_name || "Неизвестно"}</p>
                                <p><strong>Договор:</strong> ${invoice.contract_number || "Без договора"}</p>
                                <p><strong>Статус:</strong> <span class="status-badge ${statusClass}">${statusText}</span></p>
                            </div>
                            <div>
                                <p><strong>Дата выставления:</strong> ${formatDate(invoice.invoice_date)}</p>
                                <p><strong>Срок оплаты:</strong> ${formatDate(invoice.due_date)}</p>
                                ${invoice.payment_date ? `<p><strong>Дата оплаты:</strong> ${formatDate(invoice.payment_date)}</p>` : ""}
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: linear-gradient(135deg, #2c3e50, #3498db); color: white; border-radius: var(--border-radius); margin-bottom: 20px;">
                            <span style="font-size: 1.2rem;">Сумма к оплате:</span>
                            <span style="font-size: 2rem; font-weight: bold;">${formatCurrency(invoice.total_amount)}</span>
                        </div>
                        
                        ${
                          invoice.notes
                            ? `
                            <div>
                                <p><strong>Примечание:</strong></p>
                                <p style="background: var(--bg-secondary); padding: 10px; border-radius: var(--border-radius);">${invoice.notes}</p>
                            </div>
                        `
                            : ""
                        }
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('viewInvoiceModal').remove()">Закрыть</button>
                        ${
                          invoice.status === "pending"
                            ? `
                            <button class="btn btn-success" onclick="document.getElementById('viewInvoiceModal').remove(); markInvoicePaid(${invoice.id});">Отметить оплаченным</button>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;

    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
  } catch (error) {
    console.error("Ошибка загрузки счета:", error);
    showNotification("Ошибка загрузки счета", "error");
  }
}

async function markInvoicePaid(id) {
  if (!confirm("Отметить счет как оплаченный?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}/pay`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_date: new Date().toISOString().split("T")[0],
      }),
    });

    const result = await response.json();

    if (result.success) {
      showNotification("Счет отмечен оплаченным", "success");
      loadInvoices();
      loadDashboardData();
    } else {
      throw new Error(result.error || "Ошибка обновления");
    }
  } catch (error) {
    console.error("Ошибка обновления счета:", error);
    showNotification("Ошибка обновления счета", "error");
  }
}

async function loadContractsForInvoiceSelect() {
  try {
    const response = await fetch(`${API_BASE_URL}/contracts?status=active`);
    const contracts = await response.json();

    const select = document.getElementById("invoiceContract");
    select.innerHTML = '<option value="">Выберите договор</option>';
    contracts.forEach((contract) => {
      const option = document.createElement("option");
      option.value = contract.id;
      option.textContent = `${contract.contract_number} - ${contract.company_name || "Без названия"}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Ошибка загрузки договоров:", error);
  }
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "0 ₽";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU");
  } catch (error) {
    return dateString;
  }
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "";
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return dateTimeString;
  }
}

function showNotification(message, type = "info") {
  const container =
    document.getElementById("notificationContainer") ||
    createNotificationContainer();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <div class="notification-content">${message}</div>
        <button class="btn-close" onclick="this.parentElement.remove()">&times;</button>
    `;

  container.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) notification.remove();
  }, 5000);
}

function createNotificationContainer() {
  const container = document.createElement("div");
  container.id = "notificationContainer";
  container.className = "notification-container";
  document.body.appendChild(container);
  return container;
}

function getNotificationIcon(type) {
  const icons = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  return icons[type] || "info-circle";
}

function initModals() {
  const modals = document.querySelectorAll(".modal-overlay");
  modals.forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) closeModal(this.id);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const openModal = document.querySelector(".modal-overlay.active");
      if (openModal) closeModal(openModal.id);
    }
  });
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";

    if (modalId === "contractModal") {
      loadClientsForContractSelect();
      loadPriceListsForContractSelect();
    }
    if (modalId === "invoiceModal") {
      loadContractsForInvoiceSelect();
    }
    if (modalId === "priceListModal") {
      loadServicesForPriceList();
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";

    const form = modal.querySelector("form");
    if (form) {
      form.reset();
      const hiddenId = form.querySelector('input[type="hidden"]');
      if (hiddenId) hiddenId.value = "";
    }

    if (modalId === "priceListModal") {
      document.getElementById("priceListItems").innerHTML = "";
    }
  }
}

function askDelete(action, message = "Вы уверены?") {
  currentDeleteAction = action;
  document.getElementById("deleteModalText").textContent = message;
  showModal("deleteModal");
}

window.toggleTheme = toggleTheme;
window.logout = logout;
window.loadDashboardData = loadDashboardData;
window.loadRequests = loadRequests;
window.updateRequestStatus = updateRequestStatus;
window.openStatusModal = openStatusModal;
window.viewRequestDetails = viewRequestDetails;
window.createContractFromRequest = createContractFromRequest;
window.loadServices = loadServices;
window.saveService = saveService;
window.editService = editService;
window.deleteService = deleteService;
window.searchServices = searchServices;
window.filterServices = filterServices;
window.loadClients = loadClients;
window.saveClient = saveClient;
window.editClient = editClient;
window.deleteClient = deleteClient;
window.searchClients = searchClients;
window.loadPriceLists = loadPriceLists;
window.savePriceList = savePriceList;
window.editPriceList = editPriceList;
window.deletePriceList = deletePriceList;
window.viewPriceList = viewPriceList;
window.addPriceListItem = addPriceListItem;
window.loadContracts = loadContracts;
window.saveContract = saveContract;
window.editContract = editContract;
window.deleteContract = deleteContract;
window.viewContract = viewContract;
window.createInvoiceFromContractDirect = createInvoiceFromContractDirect;
window.loadInvoices = loadInvoices;
window.saveInvoice = saveInvoice;
window.editInvoice = editInvoice;
window.deleteInvoice = deleteInvoice;
window.viewInvoice = viewInvoice;
window.markInvoicePaid = markInvoicePaid;
window.showModal = showModal;
window.closeModal = closeModal;
window.askDelete = askDelete;
window.loadRecentRequests = loadRecentRequests;
window.loadUpcomingDeadlines = loadUpcomingDeadlines;
