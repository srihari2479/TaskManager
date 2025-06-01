from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
import json
import os
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

TASKS_FILE = 'tasks.json'

def load_tasks():
    """Load tasks from JSON file"""
    if os.path.exists(TASKS_FILE):
        try:
            with open(TASKS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_tasks(tasks):
    """Save tasks to JSON file"""
    with open(TASKS_FILE, 'w') as f:
        json.dump(tasks, f, indent=2)

tasks = load_tasks()

@app.route('/')
def index():
    sorted_tasks = sorted(tasks, key=lambda x: (
        {'High': 0, 'Medium': 1, 'Low': 2}.get(x['priority'], 3),
        x['due_date'] if x['due_date'] != 'No Due Date' else '9999-12-31'
    ))
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t['status'] == 'Completed'])
    pending_tasks = total_tasks - completed_tasks
    overdue_tasks = len([t for t in tasks if is_overdue(t)])
    stats = {
        'total': total_tasks,
        'completed': completed_tasks,
        'pending': pending_tasks,
        'overdue': overdue_tasks
    }
    return render_template('index.html', tasks=sorted_tasks, stats=stats)

@app.route('/add', methods=['POST'])
def add_task():
    task_name = request.form['task'].strip()
    category = request.form['category']
    priority = request.form['priority']
    due_date = request.form['due_date']
    description = request.form.get('description', '').strip()
    if not task_name:
        return jsonify({'success': False, 'message': 'Task name is required!'}), 400
    new_task = {
        'id': str(uuid.uuid4()),
        'name': task_name,
        'description': description,
        'category': category,
        'priority': priority,
        'due_date': due_date if due_date else 'No Due Date',
        'status': 'Pending',
        'created_at': datetime.now().isoformat(),
        'completed_at': None
    }
    tasks.append(new_task)
    save_tasks(tasks)
    return jsonify({'success': True, 'message': 'Task added successfully!'})

@app.route('/update/<task_id>', methods=['POST'])
def update_task(task_id):
    task = next((t for t in tasks if t['id'] == task_id), None)
    if task:
        if task['status'] == 'Completed':
            task['status'] = 'Pending'
            task['completed_at'] = None
            message = 'Task marked as pending!'
        else:
            task['status'] = 'Completed'
            task['completed_at'] = datetime.now().isoformat()
            message = 'Task completed!'
        save_tasks(tasks)
        return jsonify({'success': True, 'message': message})
    return jsonify({'success': False, 'message': 'Task not found!'}), 404

@app.route('/edit/<task_id>', methods=['GET', 'POST'])
def edit_task(task_id):
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task:
        return jsonify({'success': False, 'message': 'Task not found!'}), 404
    if request.method == 'POST':
        task['name'] = request.form['task'].strip()
        task['description'] = request.form.get('description', '').strip()
        task['category'] = request.form['category']
        task['priority'] = request.form['priority']
        task['due_date'] = request.form['due_date'] if request.form['due_date'] else 'No Due Date'
        save_tasks(tasks)
        return jsonify({'success': True, 'message': 'Task updated successfully!'})
    return render_template('edit_task.html', task=task)

@app.route('/delete/<task_id>', methods=['POST'])
def delete_task(task_id):
    global tasks
    initial_len = len(tasks)
    tasks = [t for t in tasks if t['id'] != task_id]
    if len(tasks) < initial_len:
        save_tasks(tasks)
        return jsonify({'success': True, 'message': 'Task deleted successfully!'})
    return jsonify({'success': False, 'message': 'Task not found!'}), 404

@app.route('/filter/<filter_type>')
def filter_tasks(filter_type):
    if filter_type == 'all':
        filtered_tasks = tasks
    elif filter_type == 'pending':
        filtered_tasks = [t for t in tasks if t['status'] == 'Pending']
    elif filter_type == 'completed':
        filtered_tasks = [t for t in tasks if t['status'] == 'Completed']
    elif filter_type == 'overdue':
        filtered_tasks = [t for t in tasks if is_overdue(t)]
    elif filter_type in ['Work', 'Personal', 'Others']:
        filtered_tasks = [t for t in tasks if t['category'] == filter_type]
    elif filter_type in ['High', 'Medium', 'Low']:
        filtered_tasks = [t for t in tasks if t['priority'] == filter_type]
    else:
        filtered_tasks = tasks
    sorted_tasks = sorted(filtered_tasks, key=lambda x: (
        {'High': 0, 'Medium': 1, 'Low': 2}.get(x['priority'], 3),
        x['due_date'] if x['due_date'] != 'No Due Date' else '9999-12-31'
    ))
    return jsonify([task for task in sorted_tasks])

@app.route('/search')
def search_tasks():
    query = request.args.get('q', '').lower().strip()
    if not query:
        return jsonify([])
    filtered_tasks = [
        task for task in tasks 
        if query in task['name'].lower() or 
           query in task.get('description', '').lower() or
           query in task['category'].lower()
    ]
    return jsonify(filtered_tasks)

@app.route('/api/stats')
def get_stats():
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t['status'] == 'Completed'])
    pending_tasks = total_tasks - completed_tasks
    overdue_tasks = len([t for t in tasks if is_overdue(t)])
    categories = {}
    for task in tasks:
        cat = task['category']
        if cat not in categories:
            categories[cat] = {'total': 0, 'completed': 0}
        categories[cat]['total'] += 1
        if task['status'] == 'Completed':
            categories[cat]['completed'] += 1
    return jsonify({
        'total': total_tasks,
        'completed': completed_tasks,
        'pending': pending_tasks,
        'overdue': overdue_tasks,
        'categories': categories
    })

def is_overdue(task):
    if task['due_date'] == 'No Due Date' or task['status'] == 'Completed':
        return False
    try:
        due_date = datetime.strptime(task['due_date'], '%Y-%m-%d')
        return due_date.date() < datetime.now().date()
    except:
        return False

@app.template_filter('format_date')
def format_date(date_string):
    if date_string == 'No Due Date':
        return 'No Due Date'
    try:
        date_obj = datetime.strptime(date_string, '%Y-%m-%d')
        return date_obj.strftime('%b %d, %Y')
    except:
        return date_string

@app.template_filter('days_until_due')
def days_until_due(date_string):
    if date_string == 'No Due Date':
        return None
    try:
        due_date = datetime.strptime(date_string, '%Y-%m-%d').date()
        today = datetime.now().date()
        delta = (due_date - today).days
        return delta
    except:
        return None

if __name__ == '__main__':
    app.run(debug=True)