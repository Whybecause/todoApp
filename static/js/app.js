async function isUserLoggedIn() {
    let response = await fetch('http://localhost:1337/user');
    let data = await response.json();
    return data;
}



for (let $nav of document.querySelectorAll('#nav-container')) {
    isUserLoggedIn().then(function(data) {
        // Si le serv renvoie un msg sur GET /user == on a un token
        if (data !== undefined) {
            // show current user name
            let $navContainer = document.getElementById('nav-container')
            let $userContainer = document.createElement('li');
            $userContainer.setAttribute('id', 'username');
            $userContainer.classsName = 'nav-item';
            let $userText = document.createElement('a');
            $userText.className="nav-link usernameNav";
            $userText.innerHTML = data;
            $userContainer.appendChild($userText);
            $navContainer.appendChild($userContainer);

            // Si on a un token -> Show bouton Logout 
            let $logout = document.createElement('li');
            $logout.classsName = 'nav-item';
            $logout.setAttribute('id', 'logout');
            $logout.setAttribute('callback-successs', 'logoutSuccess');
            let a = document.createElement('a');
            a.className="nav-link";
            a.setAttribute('href', '/logout');
            a.innerHTML = 'Logout';
            $logout.appendChild(a);
            $nav.appendChild($logout);

            // Remove bouton Login/Register
            let $ul = $logout.parentElement;
            let $login = $ul.getElementsByTagName('li')[0]
            let $register = $ul.getElementsByTagName('li')[1]
            $login.remove($login)
            $register.remove($register)

        }
    })
}

for (let $form of document.querySelectorAll('form')) {
    let action = $form.getAttribute("action")
    let method = $form.getAttribute("method")

    if (action && method) {
        $form.addEventListener('submit', e => {
            e.preventDefault();
            let formData =  new FormData(e.target)
            let data = {}

            for (entry of formData.entries()) {
                data[entry[0]] = entry[1];
            }

            fetch(action, {
                method: method,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data),
            }).then (function(responseRaw) {
                if (responseRaw.status >= 200 && responseRaw.status <= 299) {
                    return responseRaw.status === 204 ? true : responseRaw.json()
                }

                if (responseRaw.status >= 400 && responseRaw.status <= 599) {
                    let error = new Error('Error' + responseRaw.status);
                    error.data = responseRaw.json()
                    throw error;
                }
            }).then(function(response) {
                let callback = e.target.getAttribute('callback-success');
                if (window[callback] && typeof window[callback] === 'function') {
                    window[callback](response)
                }

                let resetFormAddTask = e.target.getAttribute('resetFormAddTask')
                if (window[resetFormAddTask] && typeof window[resetFormAddTask] === 'function') {
                    window[resetFormAddTask](response)
                }
            }).catch(error => {
                error.data.then(function(response) {
                    let callback = e.target.getAttribute('callback-error');
                    if (window[callback] && typeof window[callback] === 'function') {
                        window[callback](response)
                    }
                })
            })

        })
    }
}



function logoutSuccess() {
    location.href = "/login.html"
}

function loginSuccess(data) {
    location.href = "/"
}
function registerSuccess(data) {
    location.href= "/login.html"
}

function loginError(data) {
    document.querySelector("#emailFeedback").innerHTML = data.emailFeedback
    document.querySelector("#passwordFeedback").innerHTML = data.passwordFeedback
    document.querySelector("#email").classList.add('is-invalid')
    document.querySelector("#password").classList.add('is-invalid')
}
function registerError(data) {
    document.querySelector("#emailFeedack").innerHTML = data.emailFeedback
    document.querySelector("#email").classList.add('is-invalid')
}

function resetFormAddTask(response) {
    let $taskInput = document.getElementById('value');
    let $addTaskBtn = document.getElementById('addTaskBtn');

    if ( $taskInput.value == '') {
        alert('Veuillez entre une task');
        return;
    }
    showNewTodo(response);
    let $addNewTask = document.getElementById('addNewTask')
    $addNewTask.reset();
}

// DISPLAY TASK WHEN SUBMITING
function showNewTodo(response) {
    let todos = document.getElementById('todos');
    let taskContainer = document.createElement('li');
    taskContainer.className="cli ";
    taskContainer.setAttribute("id", response.id);

    let taskValue = document.createElement("div");
    let $value = document.getElementById('value').value;
    taskValue.className="task-value";
    taskValue.innerHTML = $value;

    let deleteBtn = document.createElement('button');
    deleteBtn.className="deleteButton";
    deleteBtn.innerHTML = "x";

    let $date = document.createElement('span');
    $date.innerHTML = response.date;
    $date.className = 'task-date';

    taskContainer.appendChild($date);
    taskContainer.appendChild(taskValue);
    
    if (response.role === 'admin') {
        let author = document.createElement('div');
        author.innerHTML = response.author;
        author.className = 'task-author';
        taskContainer.appendChild(author);
    }
    taskContainer.appendChild(deleteBtn);
    todos.appendChild(taskContainer);

}
// GET ALL: Affichage des Todos lorsqu'on arrive sur la page
async function getTodos() {
    let response = await fetch('http://localhost:1337/task');
    let data = await response.json();
    return data;
}
// APPEL -----------------

getTodos().then(function(data) {
    let todos = document.getElementById('todos');
    for (let i=0; i<data.docs.length; i++) {
        let taskContainer = document.createElement('li');
        taskContainer.className="cli ";
        taskContainer.setAttribute("id", data.docs[i]._id);

        let taskValue = document.createElement("div");
        taskValue.className="task-value";
        taskValue.innerHTML = data.docs[i].value;

        let deleteBtn = document.createElement('button');
        deleteBtn.className="deleteButton";
        deleteBtn.innerHTML = "x";
        
        let $date = document.createElement('span');
        $date.innerHTML = data.docs[i].date;
        $date.className = 'task-date';

        taskContainer.appendChild($date);
        taskContainer.appendChild(taskValue);

        // GET task/ renvoi un role si role = admin
        if (data.role) {
            let author = document.createElement('div');
            author.innerHTML = data.docs[i].author;
            author.className = 'task-author';
            taskContainer.appendChild(author);
        }
        taskContainer.appendChild(deleteBtn);
        todos.appendChild(taskContainer);
    }
})


// DELETE ONE TODO FUNCTION --------------------------------
async function deleteTask(taskId, event) {
    // Remove task from DB
    let response =  await fetch(`http://localhost:1337/task/${taskId}`, {
        method: 'DELETE'
    });
    let data = await response.json();
    
    // Remove task from screen
    let li = event.target.closest('li');
    li.parentElement.removeChild(li);
    return data;
}

async function patchTodo() {
    let response = await fetch(`http://localhost:1337/task/${taskId}`);
    let data = await response.json();
    return data;
}

// Listen for click and then update or delete
todos.addEventListener('click', event => {
    let taskId = event.target.parentNode.id;
    let elementClicked = event.target;
    // Delete task/:id
    if (elementClicked.className === 'deleteButton') {
        deleteTask(taskId, event);
}
    // PATCH TASK/:ID
    if (elementClicked.className === 'task-value') {
        let $form = document.createElement('form');
        $form.setAttribute('id', 'patchTask');

        let $btn = document.createElement('button');
        $btn.className='cbtn';
        $btn.setAttribute('type', 'submit');
        $btn.innerHTML = "Update";

        let text = elementClicked.innerHTML;
        let $input = document.createElement('input');
        $input.setAttribute('name', 'value');
        $input.type = "text"
        $input.value = text;
        $input.className = "form-control"
        elementClicked.innerHTML = "";

        $form.appendChild($input);
        $form.appendChild($btn);
        elementClicked.appendChild($form);
        elementClicked.onclik = null; 

        let $patchTask = document.getElementById('patchTask');
        $patchTask.addEventListener('submit', e => {
            e.preventDefault();
            let $formData = new FormData(e.target);
            let data = {}

            for (entry of $formData.entries()) {
                data[entry[0]] = entry[1];
            }
        
            fetch(`/task/${taskId}`, {
                method: 'PATCH',
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data),
            }).then(response => {
                return response.json();
            }).then(res => {
                elementClicked.innerHTML= res.value;
            }).catch(function(error) {
                console.log(error);
            })
        })
    }
})



