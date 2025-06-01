document.addEventListener("DOMContentLoaded", function () {
    const taskForm = document.querySelector(".task-form");
    const editForm = document.querySelector(".edit-form");
    const taskList = document.querySelector(".task-list");
    const filterButtons = document.querySelectorAll(".filter-btn");
    const searchInput = document.querySelector(".search-input");
    const themeToggle = document.querySelector(".theme-toggle");
    const addTaskBtn = document.querySelector(".add-task-btn");
    const taskFormContainer = document.querySelector(".task-form-container");
    const cancelTaskBtn = document.querySelector(".task-form .btn-secondary");
    const deleteModal = document.querySelector(".modal");
    const confirmDeleteBtn = document.querySelector(".modal .btn-danger");
    const cancelDeleteBtn = document.querySelector(".modal .btn-secondary");
    let currentTaskId = null;

    // Initialize theme
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeToggle.innerHTML = savedTheme === "dark" ? "☀️" : "🌙";

    // Toggle task form visibility
    if (addTaskBtn && taskFormContainer) {
        addTaskBtn.addEventListener("click", () => {
            taskFormContainer.style.display = taskFormContainer.style.display === "none" ? "block" : "none";
        });
    }

    // Cancel task form
    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener("click", () => {
            taskFormContainer.style.display = "none";
            taskForm.reset();
        });
    }

    // Add new task
    if (taskForm) {
        taskForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const formData = new FormData(taskForm);
            fetch("/add", {
                method: "POST",
                body: formData,
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        taskForm.reset();
                        taskFormContainer.style.display = "none";
                        flashMessage(data.message, "success");
                        updateTaskList();
                        updateStats();
                    } else {
                        flashMessage(data.message, "error");
                    }
                })
                .catch((error) => {
                    flashMessage("Error adding task", "error");
                    console.error("Error:", error);
                });
        });
    }

    // Edit task
    if (editForm) {
        editForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const taskId = editForm.action.split("/").pop();
            const formData = new FormData(editForm);
            fetch(`/edit/${taskId}`, {
                method: "POST",
                body: formData,
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        flashMessage(data.message, "success");
                        window.location.href = "/";
                    } else {
                        flashMessage(data.message, "error");
                    }
                })
                .catch((error) => {
                    flashMessage("Error updating task", "error");
                    console.error("Error:", error);
                });
        });
    }

    // Filter tasks
    filterButtons.forEach((button) => {
        button.addEventListener("click", function () {
            filterButtons.forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");
            const filterType = button.dataset.filter;
            fetch(`/filter/${filterType}`)
                .then((response) => response.json())
                .then((tasks) => {
                    renderTasks(tasks);
                })
                .catch((error) => {
                    flashMessage("Error filtering tasks", "error");
                    console.error("Error:", error);
                });
        });
    });

    // Search tasks
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const query = searchInput.value.trim();
            if (query.length > 0) {
                fetch(`/search?q=${encodeURIComponent(query)}`)
                    .then((response) => response.json())
                    .then((tasks) => {
                        renderTasks(tasks);
                    })
                    .catch((error) => {
                        flashMessage("Error searching tasks", "error");
                        console.error("Error:", error);
                    });
            } else {
                updateTaskList();
            }
        });
    }

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            themeToggle.innerHTML = newTheme === "dark" ? "☀️" : "🌙";
        });
    }

    // Handle task actions (complete, delete, edit)
    taskList.addEventListener("click", function (event) {
        const target = event.target.closest(".action-btn");
        if (!target) return;
        const taskCard = target.closest(".task-card");
        if (!taskCard) return;
        const taskId = taskCard.dataset.taskId;

        if (target.classList.contains("complete-btn") || target.classList.contains("uncomplete-btn")) {
            fetch(`/update/${taskId}`, {
                method: "POST",
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        flashMessage(data.message, data.message.includes("pending") ? "info" : "success");
                        updateTaskList();
                        updateStats();
                    } else {
                        flashMessage("Error updating task", "error");
                    }
                })
                .catch((error) => {
                    flashMessage("Error updating task", "error");
                    console.error("Error:", error);
                });
        }

        if (target.classList.contains("delete-btn")) {
            currentTaskId = taskId;
            const taskName = taskCard.querySelector(".task-title").textContent;
            const taskMeta = `${taskCard.querySelector(".task-category").textContent} • ${taskCard.querySelector(".task-priority").textContent}`;
            deleteModal.querySelector(".task-name").textContent = taskName;
            deleteModal.querySelector(".task-meta").textContent = taskMeta;
            deleteModal.style.display = "flex";
        }

        if (target.classList.contains("edit-btn")) {
            window.location.href = `/edit/${taskId}`;
        }
    });

    // Confirm delete
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", () => {
            fetch(`/delete/${currentTaskId}`, {
                method: "POST",
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        flashMessage(data.message, "success");
                        updateTaskList();
                        updateStats();
                        deleteModal.style.display = "none";
                    } else {
                        flashMessage("Error deleting task", "error");
                    }
                })
                .catch((error) => {
                    flashMessage("Error deleting task", "error");
                    console.error("Error:", error);
                });
        });
    }

    // Cancel delete
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener("click", () => {
            deleteModal.style.display = "none";
            currentTaskId = null;
        });
    }

    // Close flash messages
    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("flash-close")) {
            event.target.parentElement.remove();
        }
    });

    // Render tasks
    function renderTasks(tasks) {
        taskList.innerHTML = "";
        if (tasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks yet</h3>
                    <p>Add your first task to get started!</p>
                </div>
            `;
            return;
        }

        tasks.forEach((task) => {
            const taskCard = document.createElement("div");
            taskCard.className = `task-card ${task.status === "Completed" ? "completed" : ""} ${isOverdue(task) ? "overdue" : ""}`;
            taskCard.dataset.taskId = task.id;
            taskCard.innerHTML = `
                <div class="task-header">
                    <div class="task-priority priority-${task.priority.toLowerCase()}">
                        ${task.priority === "High" ? "🔴" : task.priority === "Medium" ? "🟡" : "🟢"} 
                        ${task.priority} Priority
                    </div>
                    <div class="task-category">
                        ${task.category === "Work" ? "🏢" : task.category === "Personal" ? "👤" : "📁"} 
                        ${task.category}
                    </div>
                </div>
                <div class="task-content">
                    <h4 class="task-title">${task.name}</h4>
                    ${task.description ? `<p class="task-description">${task.description}</p>` : ""}
                </div>
                <div class="task-meta">
                    ${task.due_date !== "No Due Date" ? `
                        <div class="task-due-date">
                            <i class="fas fa-calendar-alt"></i>
                            ${formatDate(task.due_date)}
                            ${getDueBadge(task)}
                        </div>
                    ` : ""}
                    <div class="task-status status-${task.status.toLowerCase()}">
                        <i class="fas fa-${task.status === "Completed" ? "check-circle" : "clock"}"></i>
                        ${task.status}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit-btn" title="Edit Task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn ${task.status === "Completed" ? "uncomplete-btn" : "complete-btn"}" 
                            title="${task.status === "Completed" ? "Mark as Pending" : "Mark as Completed"}">
                        <i class="fas fa-${task.status === "Completed" ? "undo" : "check"}"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Delete Task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            taskList.appendChild(taskCard);
        });
    }

    // Update task list
    function updateTaskList() {
        fetch("/filter/all")
            .then((response) => response.json())
            .then((tasks) => {
                renderTasks(tasks);
            })
            .catch((error) => {
                flashMessage("Error loading tasks", "error");
                console.error("Error:", error);
            });
    }

    // Update stats
    function updateStats() {
        fetch("/api/stats")
            .then((response) => response.json())
            .then((stats) => {
                document.querySelector(".stat-number.total").textContent = stats.total;
                document.querySelector(".stat-number.completed").textContent = stats.completed;
                document.querySelector(".stat-number.pending").textContent = stats.pending;
                document.querySelector(".stat-number.overdue").textContent = stats.overdue;
            })
            .catch((error) => {
                flashMessage("Error loading stats", "error");
                console.error("Error:", error);
            });
    }

    // Flash message
    function flashMessage(message, category) {
        const flashContainer = document.querySelector(".flash-messages");
        const flashDiv = document.createElement("div");
        flashDiv.className = `flash-message flash-${category}`;
        flashDiv.innerHTML = `
            <i class="fas fa-${category === "success" ? "check-circle" : category === "error" ? "exclamation-circle" : "info-circle"}"></i>
            ${message}
            <button class="flash-close">&times;</button>
        `;
        flashContainer.appendChild(flashDiv);
        setTimeout(() => flashDiv.remove(), 5000);
    }

    // Format date
    function formatDate(dateString) {
        if (dateString === "No Due Date") return "No Due Date";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    // Get due badge
    function isOverdue(task) {
        if (task.due_date === "No Due Date" || task.status === "Completed") return false;
        const dueDate = new Date(task.due_date);
        return dueDate < new Date();
    }

    function getDueBadge(task) {
        if (task.due_date === "No Due Date" || task.status === "Completed") return "";
        const dueDate = new Date(task.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            return `<span class="overdue-badge">${-diffDays} days overdue</span>`;
        } else if (diffDays === 0) {
            return `<span class="today-badge">Due today</span>`;
        } else {
            return `<span class="soon-badge">${diffDays} days left</span>`;
        }
    }

    // Initialize task list and stats
    updateTaskList();
    updateStats();
});