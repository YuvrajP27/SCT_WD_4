// --- State Management ---
        const STORAGE_KEY_LISTS = 'tm_vanilla_lists';
        const STORAGE_KEY_TASKS = 'tm_vanilla_tasks';
        const STORAGE_KEY_ACTIVE_LIST = 'tm_vanilla_active';

        // Initial Data
        let lists = JSON.parse(localStorage.getItem(STORAGE_KEY_LISTS)) || [
            { id: 'default', name: 'My Tasks' },
            { id: 'personal', name: 'Personal' },
            { id: 'work', name: 'Work' }
        ];

        let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY_TASKS)) || [];
        let activeListId = localStorage.getItem(STORAGE_KEY_ACTIVE_LIST) || 'default';
        let currentFilter = 'all';

        // --- Init ---
        document.addEventListener('DOMContentLoaded', () => {
            renderLists();
            renderTasks();
            updateDate();
            setupMobileMenu();
        });

        function saveData() {
            localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
            localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
            localStorage.setItem(STORAGE_KEY_ACTIVE_LIST, activeListId);
            updateStats();
        }

        function updateDate() {
            const dateEl = document.getElementById('currentListDate');
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = new Date().toLocaleDateString('en-US', options);
        }

        function updateStats() {
            const pending = tasks.filter(t => !t.completed).length;
            document.getElementById('totalPendingCount').textContent = pending;
        }

        // --- Lists ---
        function renderLists() {
            const container = document.getElementById('listsContainer');
            container.innerHTML = '';

            lists.forEach(list => {
                const count = tasks.filter(t => t.listId === list.id && !t.completed).length;
                const isActive = list.id === activeListId;

                const div = document.createElement('div');
                div.className = `nav-item ${isActive ? 'active' : ''}`;
                div.onclick = () => switchList(list.id);
                div.innerHTML = `
                    <span>${list.name}</span>
                    <span class="badge">${count}</span>
                `;
                container.appendChild(div);
            });

            // Update Header Title
            const activeList = lists.find(l => l.id === activeListId);
            document.getElementById('currentListName').textContent = activeList ? activeList.name : 'My Tasks';

            // Show/Hide Delete Button
            const deleteBtn = document.getElementById('deleteListBtn');
            const isDefault = ['default', 'personal', 'work'].includes(activeListId);
            deleteBtn.style.display = isDefault ? 'none' : 'flex';
        }

        function switchList(id) {
            activeListId = id;
            saveData();
            renderLists();
            renderTasks();
            
            // Close mobile menu if open
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('mobileOverlay').classList.remove('active');
            }
        }

        function createNewList() {
            const input = document.getElementById('newListName');
            const name = input.value.trim();
            if (name) {
                const newList = { id: 'list_' + Date.now(), name: name };
                lists.push(newList);
                activeListId = newList.id;
                saveData();
                renderLists();
                renderTasks();
                closeModal('addListModal');
                input.value = '';
            }
        }

        function deleteCurrentList() {
            if (confirm('Delete this list and all its tasks?')) {
                tasks = tasks.filter(t => t.listId !== activeListId);
                lists = lists.filter(l => l.id !== activeListId);
                activeListId = 'default';
                saveData();
                renderLists();
                renderTasks();
            }
        }

        // --- Tasks ---
        function renderTasks() {
            const container = document.getElementById('tasksContainer');
            const emptyState = document.getElementById('emptyState');
            container.innerHTML = '';

            let filtered = tasks.filter(t => t.listId === activeListId);

            if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
            else if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed);

            // Sort: Pending first, then date
            filtered.sort((a, b) => {
                if (a.completed !== b.completed) return a.completed - b.completed;
                return new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999');
            });

            if (filtered.length === 0) {
                emptyState.style.display = 'flex';
            } else {
                emptyState.style.display = 'none';
                filtered.forEach(task => container.appendChild(createTaskElement(task)));
            }

            // Update Filter Buttons
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === currentFilter);
            });
            
            updateStats();
        }

        function createTaskElement(task) {
            const div = document.createElement('div');
            div.className = `task-card ${task.completed ? 'completed' : ''}`;
            
            const dateStr = task.dueDate ? formatDueDate(task.dueDate) : '';
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

            div.innerHTML = `
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="custom-checkbox" 
                        ${task.completed ? 'checked' : ''} 
                        onchange="toggleTask('${task.id}')">
                </div>
                <div class="task-content">
                    <div class="task-text">${task.text}</div>
                    ${task.dueDate ? `
                        <div class="task-meta ${isOverdue ? 'overdue' : ''}">
                            <svg class="icon" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            ${dateStr}
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="openEditModal('${task.id}')" class="btn-icon">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button onclick="deleteTask('${task.id}')" class="btn-icon delete">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
            return div;
        }

        function addTask() {
            const input = document.getElementById('newTaskInput');
            const dateInput = document.getElementById('newTaskDate');
            const text = input.value.trim();

            if (text) {
                tasks.push({
                    id: 'task_' + Date.now(),
                    listId: activeListId,
                    text: text,
                    completed: false,
                    dueDate: dateInput.value || null
                });
                saveData();
                renderTasks();
                renderLists();
                input.value = '';
                dateInput.value = '';
                input.focus();
            }
        }

        function toggleTask(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveData();
                renderTasks();
                renderLists();
            }
        }

        function deleteTask(id) {
            tasks = tasks.filter(t => t.id !== id);
            saveData();
            renderTasks();
            renderLists();
        }

        // --- Edit Logic ---
        function openEditModal(id) {
            const task = tasks.find(t => t.id === id);
            if (!task) return;

            document.getElementById('editTaskId').value = task.id;
            document.getElementById('editTaskText').value = task.text;
            document.getElementById('editTaskDate').value = task.dueDate || '';
            
            const modal = document.getElementById('editTaskModal');
            modal.classList.add('open');
        }

        function saveTaskEdit() {
            const id = document.getElementById('editTaskId').value;
            const text = document.getElementById('editTaskText').value.trim();
            const date = document.getElementById('editTaskDate').value;

            const task = tasks.find(t => t.id === id);
            if (task && text) {
                task.text = text;
                task.dueDate = date || null;
                saveData();
                renderTasks();
                closeModal('editTaskModal');
            }
        }

        // --- Helpers ---
        function handleEnter(e) {
            if (e.key === 'Enter') addTask();
        }

        function setFilter(filter) {
            currentFilter = filter;
            renderTasks();
        }

        function openAddListModal() {
            document.getElementById('addListModal').classList.add('open');
            setTimeout(() => document.getElementById('newListName').focus(), 100);
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        function formatDueDate(dateStr) {
            const d = new Date(dateStr);
            const now = new Date();
            const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
            
            const time = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
            if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
            return `${d.toLocaleDateString([], {month: 'short', day: 'numeric'})}, ${time}`;
        }

        function setupMobileMenu() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobileOverlay');
            const toggle = () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            };
            
            document.getElementById('mobileMenuBtn').onclick = toggle;
            document.getElementById('closeSidebarBtn').onclick = toggle;
            overlay.onclick = toggle;
            
            // Show close button only on mobile
            if(window.innerWidth <= 768) {
                document.getElementById('closeSidebarBtn').style.display = 'block';
        }
    }