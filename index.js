// npm run watch

// On peux utiliser CURL pour faire des appels http (faut mettre l'ip à la place de localhost si on utilise wsl)
// librairie jq permet d'afficher le json propre
// GET
// curl --request GET --header "Content-Type: application/json" http://192.168.1.37:1337/task | jq

    // Connection
// compte admin : admin@admin.com / admin
// compte user: user@user.com / user
    // features : 
// l'admin peut voir les taks de tout le monde avec l'affichage du nom de l'auteur
// les user ne voient pas leur nom affiché à côté de chaque task

// Bugs : lors déconnection, si on clicque sur Todo, ça a pas rafffraichit et donc ça nous ammène sur la page sans pouvoir poster de task au lieu de renvoyer sur login.html

const restify = require('restify');
const Datastore = require('nedb');
const jwt = require ('jsonwebtoken');
const cookies = require('cookies');
const passphrase = 'MON-CODE-SECRET';
const moment = require('moment');

const dbTask = new Datastore({
    filename: __dirname + "/.db/task.database",
    autoload: true
});
const dbUser = new Datastore({
    filename: __dirname + "/.db/user.database",
    autoload: true
});

const server = restify.createServer();
    server.use(restify.plugins.jsonp());
    server.use(restify.plugins.bodyParser());

    server.use( (req, res, next) => {
        if (req.url.match(/\.(js|css|jpg|jpeg|png|map)$/gi)) {
            return next();
        }
        if (req.url.match(/^\/(login|register)/gi)) {
            return next();
        }
        


        let authentification = new cookies(req, res, { keys: passphrase });
        req.jwt = authentification.get('JWT')
        if (req.jwt === undefined) {
            return res.redirect('/login.html', next)
        } 

        try {
            req.jwt = jwt.verify(req.jwt, passphrase, function(err, decoded) {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized ! '});
                }
                req.userId = decoded.id;
                req.userFirstName = decoded.firstname;
                req.userLastName = decoded.lastname;
                req.perms = decoded.perms;
            });
            
        } catch(e) {
            authentification.set('JWT', null)
            return res.redirect('/login.html', next)
        }
        return next();
    }) 

    server.use( (req, res, next) => {
        if (req.perms) {
            for (let url of Object.keys(req.perms)) {
                let reg = new RegExp("^" + url ,"gi");

                if ( req.url.match(reg) && !req.perms[url][req.method]) {
                    res.status(403) 
                    return res.send()
                }                
            }
        }   
        return next()     
    })
    
    server.get('/*', restify.plugins.serveStatic({
        directory: 'static',
        default: 'index.html'
    }))

    // GET ALL TASKS
    server.get("/task", (req, res) => {
        dbUser.findOne({ _id: req.userId}, (err, foundUser) => {
            if (!err) {
                if (foundUser.role === 'admin') {
                    dbTask.find({}, function (err, docs) {
                        if (!err) {
                            return res.send({docs: docs, role: foundUser.role});
                        }
                        return res.send(err);
                    })
                } else {
                    dbTask.find({authorId: req.userId}, function (err, docs) {
                        if (!err) {
                            return res.send({docs: docs})
                        }
                        return res.send(err)
                    });
                } return;
            } return res.send(err);
        })
    });
    

    // GET ONE TASK
    server.get("/task/:id", (req, res) => {
        dbTask.findOne({_id: req.params.id}, function(err, doc) {
            if (!err) {
                return res.send(doc)
            }
            return res.send(err)
        })
    });

    // POST NEW TASK
    server.post("/task", async (req, res) => {
        // FILTRE DES DONNEES
        req.body = req.body
        let user = await dbUser.findOne({ _id: req.userId}, (err, foundUser) => {
            if (!err) {
                req.body.author = foundUser.firstname + ' ' + foundUser.lastname;
                req.body.authorId = foundUser._id;
                let date = moment().format('DD-MM-YYYY');
                req.body.date = date;
                let userRole = foundUser.role
                let author = foundUser.firstname + ' ' + foundUser.lastname;
                if (req.body.value !== ''){
                    dbTask.insert(req.body, (err, newDocument) => {
                        if (!err) {
                            
                            return res.send({ id: newDocument._id, role: userRole, author: author, date: date});
                        }
                        return res.send(err + 'error adding task');
                    })
                    return;
                } else {
                    console.log('Task can not be empty');
                }
            }
            return res.send(err + 'You need to log in');
        })
    });
    
    // UPDATE
    server.put("/task/", (req, res) => {
        req.body = req.body
        dbTask.update({}, req.body, { multi: true}, (err, numReplace) => {
            if (!err) {
                return res.send({ numReplace: numReplace})
            }
            return res.send(err)
        })
    });
    server.put("/task/:id", (req, res) => {
        req.body = req.body
        dbTask.update({_id: req.params.id }, req.body, {}, (err, numReplace) => {
            if (!err) {
                return res.send({ numReplace: numReplace})
            }
            return res.send(err)
        })
    });
    server.patch("/task/", (req, res) => {
        req.body = req.body
        dbTask.update({}, { $set: req.body}, {multi: true}, (err, numReplace) => {
            if (!err) {
                return res.send({numReplace: numReplace})
            }
            return res.send(err)
        })
    });

    server.patch("/task/:id", (req, res) => {
        req.body = req.body
        dbTask.update( { _id: req.params.id }, { $set: req.body } , (err, updatedTask) => {
            if (!err) {
                return res.send ({ updatedTask: updatedTask, value: req.body.value})
            }
            return res.send(err);
        })
    });
 
    // DELETE
    server.del("/task", (req, res) => {
        dbTask.remove({}, { multi: true}, (err, numRemoved) => {
            if (!err) {
                return res.send({ numRemoved: numRemoved})
            }
            return res.send(err);
        })
    });

    server.del("/task/:id", (req, res) => {
        dbTask.remove({_id : req.params.id }, {}, (err, numRemoved) => {
            if (!err) {
                return res.send({ numRemoved: numRemoved})
            }
            return res.send(err);
        })
    });

    //  REGISTER------------------------
    server.post("/register", (req, res) => {
        req.body = req.body
        req.body.role = 'user';
        dbUser.findOne({ email : req.body.email }, (err, user) => {
            if (!err) {
                if (!user) {
                    dbUser.insert(req.body, (err, newUser) => {
                        if (!err) {
                            res.status(201)
                            return res.send({id: newUser._id });
                        }
                        res.status(500)
                        return res.send(err);
                    })
                } else {
                    res.status(400)
                    return res.send({
                        emailFeedback: "User" + " " + req.body.email + " " + "already exists in DB"
                    })
                };
            } else {
                res.status(500)
                return  res.send(err);
            }
        })
    })

    //  LOGIN ------------------------
    server.post("/login", (req, res) => {
        // control
        req.body = req.body;
        dbUser.findOne(req.body, (err, user) => {
            if(err) {
                res.status(500)
                return res.send(err);
            }

            if(user) {
                let authentification = new cookies(req, res, { keys: passphrase });
                let perms = require('./perms/'+ user.role + ".json")
                let token = jwt.sign(
                    {id: user._id, firstname: user.firstname, lastname: user.lastname, perms: perms},
                    passphrase,
                    { expiresIn : 15 * 60 }
                );
                authentification.set('JWT', token)
                res.status(204)
                return res.send();

            } else {
                res.status(400)
                return res.send({
                    emailFeedback: 'Identifiants de connection incorrect',
                    passwordFeedback: 'Identifiants de connection incorrects'
                });

            }
        })
    })

    // LOGOUT
    server.get('/logout', function (req, res, next) {
        let authentification = new cookies(req, res, { keys: passphrase });
        req.jwt = authentification.get('JWT')
        if (req.jwt) {
            authentification.set('JWT', null);
            return res.redirect('/login.html', next);
        }
      });

    //   CURRENT USER
    server.get('/user', function (req, res, next) {
        let authentification = new cookies(req, res, { keys: passphrase });
        req.jwt = authentification.get('JWT')
        if (req.jwt) {
            // return res.send('connected');
            let username = req.userFirstName + ' ' + req.userLastName;
            return res.send(username);
        } else {
            return res.send(undefined);
        }
        next();
    })

    server.listen(1337, () => {
        console.log("Le serveur tourne sur le port 192.168.1.37:1337");
    });


/*

CRUD        SQL     METHOD

Creation    INSERT  POST
Read        SELECT  GET
Update      UPDATE  PATCH/PUT
Delete      DELETE  DELETE

*/

/*
    [GET] /task     |Liste de toutes les taches qui existent
    [GET] /task/22 | Une Tache qui contient l'id 22

    [POST] /task    | Création de la tache
    + value = "Faire un système de tache"

    [PATCH] /task/22    | Modification sur la trache 22
    + value = "Faire un systeme de tacche"

    [PATCH] /task | Modification sur toutes les taches en base
    + value = "Faire un ssystème de tache"

    [PUT] /task/22 | Modiffication ssur la tache 22
    + value = "Faire un système de tache"

    [DELETE] /task | Delete lees taches
    [DELETE] /task/22 | Delete la tache 222

    DELETE = GET        | URL
    PUT = PATCH = POST  | FORM BODY


*/