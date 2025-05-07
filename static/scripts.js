document.addEventListener("DOMContentLoaded", function () {
    const taskForm = document.querySelector("form");
    const taskInput = document.querySelector("input[name='task']");
    const categorySelect = document.querySelector("select[name='category']");
    const prioritySelect = document.querySelector("select[name='priority']");
    const dueDateInput = document.querySelector("input[name='due_date']");
    const taskList = document.querySelector(".task-list ul");

    // Add new task
    taskForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const task = taskInput.value.trim();
        const category = categorySelect.value;
        const priority = prioritySelect.value;
        const dueDate = dueDateInput.value;

        if (task === "") {
            alert("Please enter a task.");
            return;
        }

        addTaskToList(task, category, priority, dueDate, false);
        taskForm.reset();
    });

    // Function to add task to list
    function addTaskToList(task, category, priority, dueDate, completed) {
        const li = document.createElement("li");
        if (completed) li.classList.add("completed");

        li.innerHTML = `
            <span>${task} - ${category} - ${priority} ${dueDate ? `(Due: ${dueDate})` : ""}</span>
            <div class="task-actions">
                <button class="complete-btn">✔</button>
                <button class="delete-btn">✖</button>
            </div>
        `;

        taskList.appendChild(li);
        attachTaskEvents(li);
    }

    // Attach event listeners to task actions
    function attachTaskEvents(taskItem) {
        taskItem.querySelector(".complete-btn").addEventListener("click", function () {
            taskItem.classList.toggle("completed");
        });

        taskItem.querySelector(".delete-btn").addEventListener("click", function () {
            taskItem.remove();
        });
    }
});
