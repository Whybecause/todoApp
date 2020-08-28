async function isUserLoggedIn() {
    let response = await fetch('http://localhost:1337/user');
    let data = await response.json();
    return data;
}

for (let $logout of document.querySelectorAll('#logout')) {
    isUserLoggedIn().then(function(data) {
        // Si on a un token -> Show bouton Logout 
        if (data !== undefined) {
            let a = document.createElement('a');
            a.className="nav-link";
            a.setAttribute('href', '/logout');
            a.innerHTML = 'Logout';
            $logout.appendChild(a);

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
            console.log($form);
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

function resetFormAddTask() {
    let $addNewTask = document.getElementById('addNewTask')
    $addNewTask.reset();
}

// GET ALL: Affichage des Todos lorsqu'on arrive sur la page
//  FUNCTION -----------------------------
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
        
        taskContainer.appendChild(taskValue);
        // L'admin peut voir le nom des autheurs de chaque task
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
            // e.preventDefault();
            let $formData = new FormData(e.target);
            let data = {}
            for (entry of $formData.entries()) {
                data[entry[0]] = entry[1];
            }
            fetch(`/task/${taskId}`, {
                method: 'PATCH',
                body: $formData
            }).then(function(response) {
                return response.text();
            }).then(function(res) {
                console.log(res);
            }).catch(function(error) {
                console.log(error);
            })
        })
    }
})



