from flask import Flask, render_template, request, redirect, url_for
from datetime import datetime

app = Flask(__name__)

# Sample task list
tasks = []

@app.route('/')
def index():
    return render_template('index.html', tasks=tasks)

@app.route('/add', methods=['POST'])
def add_task():
    task_name = request.form['task']
    category = request.form['category']
    priority = request.form['priority']
    due_date = request.form['due_date']
    
    tasks.append({
        'name': task_name,
        'category': category,
        'priority': priority,
        'due_date': due_date if due_date else 'No Due Date',
        'status': 'Pending'
    })
    return redirect(url_for('index'))

@app.route('/update/<int:task_id>')
def update_task(task_id):
    tasks[task_id]['status'] = 'Completed'
    return redirect(url_for('index'))

@app.route('/edit/<int:task_id>', methods=['GET', 'POST'])
def edit_task(task_id):
    if request.method == 'POST':
        tasks[task_id]['name'] = request.form['task']
        tasks[task_id]['category'] = request.form['category']
        tasks[task_id]['priority'] = request.form['priority']
        tasks[task_id]['due_date'] = request.form['due_date'] if request.form['due_date'] else 'No Due Date'
        return redirect(url_for('index'))
    return render_template('edit_task.html', task=tasks[task_id], task_id=task_id)

@app.route('/delete/<int:task_id>')
def delete_task(task_id):
    del tasks[task_id]
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
