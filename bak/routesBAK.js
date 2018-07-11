// routes/routes.js
var multer = require('multer');
var mysql = require('mysql');
var config = require('../config/mainconf');
var con_CS = mysql.createConnection(config.commondb_connection);
var uploadPath = config.Upload_Path;
var path = require('path');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var nodemailer = require('NodeMailer');
var Influx = require('influx');
var cors = require('cors');
var async = require('async');
var crypto = require('crypto');
var fs = require("fs");
var rimraf = require("rimraf");
var mkdirp = require("mkdirp");
var multiparty = require('multiparty');

var fileInputName = process.env.FILE_INPUT_NAME || "qqfile";
var maxFileSize = process.env.MAX_FILE_SIZE || 0; // in bytes, 0 for unlimited

var Layerpath = "";
var filePathName = "";
var filePath, transactionID, myStat, myVal, myErrMsg, token, errStatus;
var today, date2, date3, time2, time3, dateTime, tokenExpire;

// var storage = multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, uploadPath);
//     },
//     filename: function (req, file, callback) {
//         //console.log(file.fieldname + " " + file.originalname);
//         filePathName += file.fieldname + '-' + file.originalname + ";";
//         //console.log(filePathName);
//         callback(null, file.fieldname + '-' + file.originalname);
//     }
// });
//
// var fileUpload = multer({storage: storage}).any();

var smtpTrans = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'aaa.zhao@g.feitianacademy.org',
        pass: "12344321"
    }
});

con_CS.query('USE ' + config.Login_db); // Locate Login DB

var con_Water = new Influx.InfluxDB({
    database: 'FTAA_Water',
    host: 'aworldbridgelabs.com',
    port: 8086,
    username: 'trueman',
    password: 'TruemanWu!04',
    schema: [
        {
            measurement: 'Water_Experiment',
            fields: {
                Benchmark: Influx.FieldType.STRING,
                Building_1_Drinking_Water: Influx.FieldType.FLOAT,
                Building_2_Drinking_Water: Influx.FieldType.FLOAT,
                Remark: Influx.FieldType.STRING,
                Unit: Influx.FieldType.STRING
            },
            tags: [
                'Element'
            ]
        }
    ]
});

var con_EnergyBudget = new Influx.InfluxDB({
    database: 'FTAA_Energy',
    host: 'aworldbridgelabs.com',
    port: 8086,
    username: 'trueman',
    password: 'TruemanWu!04',
    schema: [
        {
            measurement: 'Energy_Budget',
            fields: {
                Electricity_Usage: Influx.FieldType.FLOAT,
                Machine_Name: Influx.FieldType.STRING
            },
            tags: [
                'Machine_ID'
            ]
        }
    ]
});

var con_EnergyPredic = new Influx.InfluxDB({
    database: 'FTAA_Energy',
    host: 'aworldbridgelabs.com',
    port: 8086,
    username: 'trueman',
    password: 'TruemanWu!04',
    schema: [
        {
            measurement: 'Actual_vs_Prediction',
            fields: {
                Actual_Electricity_Usage: Influx.FieldType.FLOAT,
                Predict_Electricity_Usage: Influx.FieldType.FLOAT
            },
            tags: [

            ]
        }
    ]
});

var con_Wind = new Influx.InfluxDB({
    host: '10.11.90.15',
    database: 'Wind_Station',
    schema: [
        {
            measurement: 'WS_MT1',
            fields: {
                Temp_out: Influx.FieldType.STRING,
                Hum_out: Influx.FieldType.INTEGER,
                Wind_Speed: Influx.FieldType.INTEGER
            },
            tags: []
        }
    ]
});

module.exports = function (app, passport) {

    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(cors({
        origin: '*',
        credentials: true
    }));


    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function (req, res) {
        // res.render('index.ejs'); // load the index.ejs file
        res.redirect('/login');
    });

    // =====================================
    // LOGIN PAGE===========================
    // =====================================
    // show the login form
    app.get('/login', function (req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', {message: req.flash('loginMessage')});
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
            successRedirect: '/loginUpdate', // redirect to the secure profile section
            failureRedirect: '/login', // redirect back to the signup page if there is an error
            failureFlash: true // allow flash messages
        }),
        function (req, res) {
            if (req.body.remember) {
                req.session.cookie.maxAge = 1000 * 60 * 3;
                req.session.cookie.expires = false;
            }
            //res.redirect('/login');
        });

    // Update user login status
    app.get('/loginUpdate', isLoggedIn, function (req, res) {
        dateNtime();

        myStat = "UPDATE Users SET status = 'Active', lastLoginTime = ? WHERE username = ?";
        myVal = [dateTime, req.user.username];
        myErrMsg = "Please try to login again";
        updateDBNredir(myStat, myVal, myErrMsg, "login.ejs", "/newEntry", res);
    });

    app.get('/forgot', function (req, res) {
        res.render('forgotPassword.ejs', {message: req.flash('forgotPassMessage')});

    });

    app.post('/email', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        var statement = "SELECT * FROM Users WHERE username = '" + req.body.username + "';";
        //console.log(statement);

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else if (results.length === 0) {
                res.json({"error": true, "message": "Please verify your email address !"});
            } else {
                async.waterfall([
                    function(done) {
                        crypto.randomBytes(20, function(err, buf) {
                            token = buf.toString('hex');
                            tokenExpTime();
                            done(err, token, tokenExpire);
                        });
                    },
                    function (token, tokenExpire, done) {
                        // con_CS.query( "INSERT INTO Users ( resetPasswordExpires, resetPasswordToken ) VALUES (?,?) WHERE username = '" + req.body,username + "'; ")
                        myStat = "UPDATE Users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE username = '" + req.body.username + "' ";
                        myVal = [token, tokenExpire];
                        con_CS.query(myStat, myVal, function (err, rows) {

                            //newUser.id = rows.insertId;

                            if (err) {
                                console.log(err);
                                // res.send("Token Insert Fail!");
                                // res.end();
                                res.json({"error": true, "message": "Token Insert Fail !"});
                            } else {
                                done(err, token);
                            }
                        });
                    },
                    function(token, done, err) {
                        // Message object
                        var message = {
                            from: 'FTAA <aaaa.zhao@g.feitianacademy.org>', // sender info
                            to: req.body.username, // Comma separated list of recipients
                            subject: 'Password Reset', // Subject of the message

                            // plaintext body
                            text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                        };

                        smtpTrans.sendMail(message, function(error){
                            if(error){
                                console.log(error.message);
                                // alert('Something went wrong! Please double check if your email is valid.');
                                return;
                            } else {
                                // res.send('Message sent successfully! Please check your email inbox.');
                                console.log('Message sent successfully!');
                                // res.redirect('/login');
                                res.json({"error": false, "message": "Message sent successfully !"});
                                // alert('An e-mail has been sent to ' + req.body.username + ' with further instructions.');
                            }
                        });
                    }
                ], function(err) {
                        if (err) return next(err);
                        // res.redirect('/forgot');
                        res.json({"error": true, "message": "An unexpected error occurred !"});
                });
            }
        });
    });

    app.get('/reset/:token', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT * FROM Users WHERE resetPasswordToken = '" + req.params.token + "'";

        con_CS.query(myStat, function(err, user) {
            dateNtime();

            if (!user || dateTime > user[0].resetPasswordExpires) {
                res.send('Password reset token is invalid or has expired. Please contact Administrator.');
            } else {
                res.render('reset.ejs', { user: user[0]});
            }
        });
    });

    app.post('/reset/:token', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        async.waterfall([
            function(done) {

                myStat = "SELECT * FROM Users WHERE resetPasswordToken = '" + req.params.token + "'";

                con_CS.query(myStat, function(err, user) {
                    var userInfo = JSON.stringify(user, null, "\t");

                    if (!user) {
                        res.send('Password reset token is invalid or has expired. Please contact Administrator.');
                    } else {
                        var newPass = {
                            Newpassword: bcrypt.hashSync(req.body.newpassword, null, null),
                            ConfirmPassword: bcrypt.hashSync(req.body.Confirmpassword, null, null)
                        };

                        var passReset = "UPDATE Users SET password = '" + newPass.Newpassword + "' WHERE username = '" + req.body.username + "'";

                        con_CS.query(passReset, function (err, rows) {
                            if (err) {
                                console.log(err);
                                res.send("New Password Insert Fail!");
                            } else {
                                done()
                            }
                        });
                    }

                });
            }, function(user, done, err) {

                var message = {
                    from: 'FTAA <aaaa.zhao@g.feitianacademy.org>',
                    to: req.body.username,
                    subject: 'Your password has been changed',
                    text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account, ' + changeMail(req.body.username) + ' has just been changed.\n'
                };

                smtpTrans.sendMail(message, function (error) {
                    if(error){
                        console.log(error.message);
                        // alert('Something went wrong! Please double check if your email is valid.');
                        return;
                    } else {
                        res.redirect('/login');
                    }
                });
            }
        ]);
    });


    // =====================================
    // USER PROFILE  =======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    // Show user profile page
    app.get('/userProfile', isLoggedIn, function (req, res) {
        res.render('userProfile.ejs', {user: req.user});
    });

    // Update user profile page
    app.post('/userProfile', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        var user = req.user;
        var newPass = {
            firstname: req.body.usernameF,
            lastname: req.body.usernameL,
            currentpassword: req.body.currentpassword,
            Newpassword: bcrypt.hashSync(req.body.newpassword, null, null),
            ConfirmPassword: bcrypt.hashSync(req.body.Confirmpassword, null, null)
        };

        dateNtime();

        myStat = "UPDATE Users SET firstName =?, lastName = ?, dateModified  = ? WHERE username = ? ";
        myVal = [newPass.firstname, newPass.lastname, dateTime, user.username];

        con_CS.query(myStat, myVal, function (err, rows) {
            if(err){
                console.log(err);
                res.json({"error": true, "message": "Fail !"});
            } else {
                var passComp = bcrypt.compareSync(newPass.currentpassword, user.password);
                if (!!req.body.newpassword && passComp) {
                    var passReset = "UPDATE Users SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

                    con_CS.query(passReset, function (err, rows) {
                        //console.log(result);
                        if (err) {
                            console.log(err);
                            res.json({"error": true, "message": "Fail !"});
                        } else {
                            res.json({"error": false, "message": "Success !"});
                        }
                    });
                } else {
                    res.json({"error": false, "message": "Success !"});
                }
            }
        });
    });

    // routes.post("/uploads", isLoggedIn, onUpload);

    // =====================================
    // USER MANAGEMENT =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    // Show user management bak page
    app.get('/userManagement', isLoggedIn, function (req, res) {
        myStat = "SELECT userrole FROM Users WHERE username = '" + req.user.username + "';";

        con_CS.query(myStat, function (err, results, fields) {

            if (!results[0].userrole) {
                console.log("Error");
            } else if (results[0].userrole === "Admin" || "Regular") {
                // process the signup form
                res.render('userManagement.ejs', {
                    user: req.user // get the user out of session and pass to template
                });
            }
        });
    });

    // show the signup form
    app.get('/signup', isLoggedIn, function (req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', {
            user: req.user,
            message: req.flash('signupMessage')
        });
    });

    app.post('/signup', isLoggedIn, function (req, res) {

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // con_CS.query('USE ' + config.Login_db); // Locate Login DB

        var newUser = {
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: bcrypt.hashSync(req.body.password, null, null),  // use the generateHash function
            userrole: req.body.userrole,
            dateCreated: req.body.dateCreated,
            createdUser: req.body.createdUser,
            dateModified: req.body.dateCreated,
            status: req.body.status
        };

        myStat = "INSERT INTO Users ( username, firstName, lastName, password, userrole, dateCreated, dateModified, createdUser, status) VALUES (?,?,?,?,?,?,?,?,?)";
        myVal = [newUser.username, newUser.firstName, newUser.lastName, newUser.password, newUser.userrole, newUser.dateCreated, newUser.dateModified, newUser.createdUser, newUser.status];
        con_CS.query(myStat, myVal, function (err, rows) {

            //newUser.id = rows.insertId;

            if (err) {
                console.log(err);
                res.send("New User Insert Fail!");
                res.end();
            } else {
                res.render('userHome.ejs', {
                    user: req.user // get the user out of session and pass to template
                });
            }
        });
    });

    // Filter by search criteria
    app.get('/filterUser', isLoggedIn, function (req, res) {
        myStat = "SELECT * FROM Users";

        var myQuery = [
            {
                fieldVal: req.query.dateCreatedFrom,
                dbCol: "dateCreated",
                op: " >= '",
                adj: req.query.dateCreatedFrom
            },
            {
                fieldVal: req.query.dateCreatedTo,
                dbCol: "dateCreated",
                op: " <= '",
                adj: req.query.dateCreatedTo
            },
            {
                fieldVal: req.query.dateModifiedFrom,
                dbCol: "dateModified",
                op: " >= '",
                adj: req.query.dateModifiedFrom
            },
            {
                fieldVal: req.query.dateModifiedTo,
                dbCol: "dateModified",
                op: " <= '",
                adj: req.query.dateModifiedTo
            },
            {
                fieldVal: req.query.firstName,
                dbCol: "firstName",
                op: " = '",
                adj: req.query.firstName
            },
            {
                fieldVal: req.query.lastName,
                dbCol: "lastName",
                op: " = '",
                adj: req.query.lastName
            },
            {
                fieldVal: req.query.userrole,
                dbCol: "userrole",
                op: " = '",
                adj: req.query.userrole
            }
        ];

        // QueryStat(myQueryObj, myStat, res)

        function userQuery() {
            res.setHeader("Access-Control-Allow-Origin", "*");
            // console.log("Query Statement: " + queryStat);

            con_CS.query(myStat, function (err, results, fields) {

                var status = [{errStatus: ""}];

                if (err) {
                    console.log(err);
                    status[0].errStatus = "fail";
                    res.send(status);
                    res.end();
                } else if (results.length === 0) {
                    status[0].errStatus = "no data entry";
                    res.send(status);
                    res.end();
                } else {
                    var JSONresult = JSON.stringify(results, null, "\t");
                    console.log(JSONresult);
                    res.send(JSONresult);
                    res.end();
                }
            });
        }

        var j = 0;

        for (var i = 0; i < myQuery.length; i++) {
            // console.log("i = " + i);
            // console.log("field Value: " + !!myQuery[i].fieldVal);
            if (i === myQuery.length - 1) {
                if (!!myQuery[i].fieldVal) {
                    if (j === 0) {
                        myStat += " WHERE " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                        j = 1;
                        userQuery()
                    } else {
                        myStat += " AND " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                        userQuery()
                    }
                } else {
                    userQuery()
                }
            } else {
                if (!!myQuery[i].fieldVal) {
                    if (j === 0) {
                        myStat += " WHERE " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                        j = 1;
                    } else {
                        myStat += " AND " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                    }
                }
            }
        }
    });

    // Retrieve user data from user management page
    var edit_User, edit_firstName, edit_lastName, edit_userrole, edit_status;
    app.get('/editUserQuery', isLoggedIn, function(req, res) {

        edit_User = req.query.Username;
        edit_firstName = req.query.First_Name;
        edit_lastName = req.query.Last_Name;
        edit_userrole = req.query.User_Role;
        edit_status = req.query.Status;
        res.json({"error": false, "message": "/editUser"});
    });

    // Show user edit form
    app.get('/editUser', isLoggedIn, function(req, res) {
        res.render('userEdit.ejs', {
            user: req.user, // get the user out of session and pass to template
            userName: edit_User,
            firstName: edit_firstName,
            lastName: edit_lastName,
            userrole: edit_userrole,
            status: edit_status,
            message: req.flash('Data Entry Message')
        });
    });

    app.post('/editUser', isLoggedIn, function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        if (req.body.newPassword !== "") {
            var updatedUserPass = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status,
                newPassword: bcrypt.hashSync(req.body.newPassword, null, null)
            };

            myStat = "UPDATE Users SET firstName = ?, lastName = ?, password = ?, userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "' WHERE username = ?";
            myVal = [updatedUserPass.firstName, updatedUserPass.lastName, updatedUserPass.newPassword, updatedUserPass.userrole, updatedUserPass.status, edit_User];
            updateDBNres(myStat, myVal, "Update failed!", "/userManagement", res);

        } else {
            var updatedUser = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status
            };

            myStat = "UPDATE Users SET firstName = ?, lastName = ?, userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "'  WHERE username = ?";
            myVal = [updatedUser.firstName, updatedUser.lastName, updatedUser.userrole, updatedUser.status, edit_User];

            updateDBNres(myStat, myVal, "Update failed!", "/userManagement", res);
        }

    });

    app.get('/suspendUser', isLoggedIn, function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        dateNtime();

        var username = req.query.usernameStr.split(",");
        myStat = "UPDATE Users SET modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "',  status = 'Suspended'";

        for (var i = 0; i < username.length; i++) {
            if (i === 0) {
                myStat += " WHERE username = '" + username[i] + "'";
                if (i === username.length - 1) {
                    updateDBNres(myStat, "", "Suspension failed!", "/userManagement", res);
                }
            } else {
                myStat += " OR username = '" + username[i] + "'";
                if (i === username.length - 1) {
                    updateDBNres(myStat, "", "Suspension failed!", "/userManagement", res);
                }
            }
        }
    });

    // =====================================
    // TRANSACTION SECTION =================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    app.post('/upload', onUpload);

    app.post('/submit',function(req,res){
        console.log (req.body);
        var result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        // console.log (result);
        res.setHeader("Access-Control-Allow-Origin", "*");

        var name = "";
        var value = "";

        for(var i = 0; i < result.length; i++){
            if (i === result.length - 1) {
                name += result[i][0];
                value += '"' + result[i][1] + '"';
            } else {
                name += result[i][0] + ", ";
                value += '"' + result[i][1] + '"' + ", ";
            }

        }
        // var newImage = {
        //     Layer_Uploader: "http://localhost:9086/uploadfiles/" + responseDataUuid,
        //     Layer_Uploader_name: responseDataUuid
        // };
        // name += ", Layer_Uploader, Layer_Uploader_name";
        // value += ", '" + newImage.Layer_Uploader + "','" +newImage.Layer_Uploader_name + "'";

        // var filepathname = "http://localhost:9086/uploadfiles/" + responseDataUuid ;
        var statement1 = "INSERT INTO CitySmart.New_Users (" + name + ") VALUES (" + value + ");";
        console.log(statement1);

        con_CS.query(statement1, function(err,result) {
            if (err) {
                throw err;
            } else {
                res.json("Connected!")
            }
        });

    });

    app.get('/newHum', function (req, res) {
        var myStat = "SELECT Hum_Out, time FROM WS_MT1 WHERE time >= '" + req.query.timeFrom + "' AND time <= '" + req.query.timeTo + "'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            var status = [{errStatus: ""}];

            if (err) {
                console.log(err);
                status[0].errStatus = "fail";
                res.send(status);
                res.end();
            } else if (result.length === 0) {
                status[0].errStatus = "no data entry";
                res.send(status);
                res.end();
            } else {
                var Hum_Out = [];

                Hum_Out = JSON.stringify(result, null, "\t");
                console.log(Hum_Out);
                res.send(Hum_Out);
                res.end();
            }
        }).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    });
    });

    app.get('/newTemp', function (req, res) {
        var myStat = "SELECT Temp_Out, time FROM WS_MT1 WHERE time >= '" + req.query.timeFrom + "' AND time <= '" + req.query.timeTo + "'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            var status = [{errStatus: ""}];

            if (err) {
                console.log(err);
                status[0].errStatus = "fail";
                res.send(status);
                res.end();
            } else if (result.length === 0) {
                status[0].errStatus = "no data entry";
                res.send(status);
                res.end();
            } else {
                var Temp_Out = [];

                Temp_Out = JSON.stringify(result, null, "\t");
                console.log(Temp_Out);
                res.send(Temp_Out);
                res.end();
            }
        }).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    });
    });

    app.get('/newWind', function (req, res) {
        var myStat = "SELECT Wind_Speed, time FROM WS_MT1 WHERE time >= '" + req.query.timeFrom + "' AND time <= '" + req.query.timeTo + "'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            var status = [{errStatus: ""}];

            if (err) {
                console.log(err);
                status[0].errStatus = "fail";
                res.send(status);
                res.end();
            } else if (result.length === 0) {
                status[0].errStatus = "no data entry";
                res.send(status);
                res.end();
            } else {
                var Wind_Speed = [];

                Wind_Speed = JSON.stringify(result, null, "\t");
                console.log(Wind_Speed);
                res.send(Wind_Speed);
                res.end();
            }
        }).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    });
    });

    app.get('/allHum', function (req, res) {
        var myStat = "SELECT Hum_Out, time FROM WS_MT1 WHERE time >= '2018-04-01T04:00:00.000Z' AND time <= '2018-05-30T04:00:00.000Z'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            var status = [{errStatus: ""}];

            if (err) {
                console.log(err);
                status[0].errStatus = "fail";
                res.send(status);
                res.end();
            } else if (result.length === 0) {
                status[0].errStatus = "no data entry";
                res.send(status);
                res.end();
            } else {
                var Hum_Out = [];

                Hum_Out = JSON.stringify(result, null, "\t");
                console.log(Hum_Out);
                res.send(Hum_Out);
                res.end();
            }
        }).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    });
    });

    app.get('/allTemp', function (req, res) {
        var myStat = "SELECT Temp_Out, time FROM WS_MT1 WHERE time >= '2018-04-01T04:00:00.000Z' AND time <= '2018-05-30T04:00:00.000Z'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            var status = [{errStatus: ""}];

            if (err) {
                console.log(err);
                status[0].errStatus = "fail";
                res.send(status);
                res.end();
            } else if (result.length === 0) {
                status[0].errStatus = "no data entry";
                res.send(status);
                res.end();
            } else {
                var Temp_Out = [];

                Temp_Out = JSON.stringify(result, null, "\t");
                console.log(Temp_Out);
                res.send(Temp_Out);
                res.end();
            }
        }).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    });
    });

    app.get('/allWind', function (req, res) {
        var myStat = "SELECT Wind_Speed, time FROM WS_MT1 WHERE time >= '2018-04-01T04:00:00.000Z' AND time <= '2018-05-30T04:00:00.000Z'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            var status = [{errStatus: ""}];

            if (err) {
                console.log(err);
                status[0].errStatus = "fail";
                res.send(status);
                res.end();
            } else if (result.length === 0) {
                status[0].errStatus = "no data entry";
                res.send(status);
                res.end();
            } else {
                var Wind_Speed = [];

                Wind_Speed = JSON.stringify(result, null, "\t");
                console.log(Wind_Speed);
                res.send(Wind_Speed);
                res.end();
            }
        }).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    });
    });

    app.get('/CountryList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT CountryName FROM LayerMenu GROUP BY CountryName", function (err, results) {
            if (err) throw err;
            res.json(results);
            console.log(results);
        });
    });

    app.get('/StateList',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT CountryName, StateName, COUNT (*) AS count FROM LayerMenu GROUP BY CountryName, StateName',function (err,results,fields) {
            if (err) throw err;
            res.json(results);
            console.log(results);

        });
    });

    app.get('/CityList',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT StateName, FirstLayer, SecondLayer, CityName FROM LayerMenu',function (err,results) {
            res.json(results);
            console.log(results);
        });
    });

    app.get('/ChangeCityName',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT CityName, StateName, COUNT (*) AS count FROM LayerMenu GROUP BY CityName, StateName',function (err,results,fields) {
            res.json(results);
            console.log(results);
        });
    });

    app.get('/recover',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        var recoverIDStr = req.query.recoverIDStr;
        console.log(recoverIDStr);
        for(var i = 0; i < recoverIDStr.length; i++) {
            var statement = "UPDATE CitySmart.GeneralFormDatatable SET Status = 'Active' WHERE ID = '" + recoverIDStr[i] + "'";
            con_CS.query(statement, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }
    });

    app.get('/approve',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        var approveIDStr = req.query.approveIDStr;
        console.log(approveIDStr);
        for(var i = 0; i < approveIDStr.length; i++) {
            var statement = "UPDATE CitySmart.GeneralFormDatatable SET Status = 'Active' WHERE ID = '" + approveIDStr[i] + "'";
            con_CS.query(statement, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }
    });

//Put back the photo in the form
    app.get('/edit', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        var editIDSr = req.query.editIDSr;
        // console.log(editIDSr);
        var myStat = "SELECT Layer_Uploader, Layer_Uploader_name FROM GeneralFormDatatable WHERE ID = '" + editIDSr + "'";
        // console.log(myStat);

        var filePath0;
        con_CS.query(myStat, function (err, results) {
            // console.log("query statement : " + myStat);
            if (!results[0].Layer_Uploader && !results[0].Layer_Uploader_name) {
                console.log("Error");
            } else {
                filePath0 = results[0];
                var JSONresult = JSON.stringify(results, null, "\t");
                // console.log(JSONresult);
                res.send(JSONresult);
                res.end()
            }
        });
    });

//Delete button
    app.get('/deleteData', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        var transactionID = req.query.transactionIDStr.split(',');
        console.log(transactionID);
        for(var i = 0; i < transactionID.length; i++) {
            var statement = "UPDATE CitySmart.GeneralFormDatatable SET Status = 'Delete' WHERE ID = '" + transactionID[i] + "'";
            // console.log(statement);
            con_CS.query(statement, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }

    });

//AddData in table
    app.get('/AddData',function (req,res){
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT * FROM GeneralFormDatatable",function (err,results) {
            if (err) throw err;
            res.json(results);
        })
    });

//check if the layer name is available
    app.get('/SearchLayerName',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM LayerMenu", function (err, results) {
            if (err) throw err;
            res.json(results);

        });
    });


    app.post('/submitL',function (req,res){
        console.log (req.body);
        var result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        res.setHeader("Access-Control-Allow-Origin", "*");

        var name = "";
        var value = "";

        for(var i = 0; i < result.length; i++){
            if (i === result.length - 1) {
                name += result[i][0];
                value += '"' + result[i][1] + '"';
            } else {
                name += result[i][0] + ", ";
                value += '"' + result[i][1] + '"' + ", ";
            }
        }
    });

    app.get('/EditData',function (req,res){
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT Full Name, Address Line 1, Address Line 2, City, State/Province/Region, Postal Code/ZIP, Country, Email, Phone Number, Layer Name, Layer Category, Layer Description, Layer Uploader FROM GeneralFormDatatable",function (err,results) {
            if (err) throw err;
            console.log(results);
        })
    });

    app.get('/SearchLayerName',function (req,res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM LayerMenu", function (err, results) {
            if (err) throw err;
            // console.log(results);
            res.json(results);

        });
    });

    app.delete("/deleteFiles/:uuid", onDeleteFile);

    app.get('/firstlayer', function (req, res) {

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT FirstLayer From LayerMenu", function (err, result) {

            console.log("recive and processing");

            var JSONresult = JSON.stringify(result, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);

            res.end();

        });
    });

    app.get('/secondlayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT SecondLayer From LayerMenu", function (err,result) {

            console.log("recive and processing");

            var JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
            res.end();

        });

    });

    app.get('/thirdlayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT ThirdLayer From LayerMenu", function (err,result) {

            console.log("recive and processing");

            var JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
            res.end();

        });

    });


    app.get('/layername', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT LayerName From LayerMenu", function (err,result) {

            console.log("recive and processing");

            var JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
            res.end();

        });
    });

    app.get('/createlayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT * From CitySmart.LayerMenu", function (err,result) {
            console.log("recive and processing");

            var JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
            res.end();

        });

    });

    app.get('/times', function (req, res) {
        con_Wind.query('select * from WS_MT1'
        ).then(result => {
            console.log(result.length);
        res.send(result)
    }).catch(err => {
            res.status(500).send(err.stack)
    })
    });

    app.get('/ChangeSelectList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT Country, City FROM Country2City", function (err, results) {
            if (err) throw err;
            res.send(results);
            res.end();
        });
    });

    app.get('/ChangeLayerList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT FirstLayer , SecondLayer , CityName , ClassName FROM LayerMenu", function (err, results) {
            if (err) throw err;
            var layerInfo = JSON.stringify(results, null, "\t");
            res.send(layerInfo);
            console.log(res);
            res.end();

        });
    });

    app.get('/filterUser', function (req, res) {
        var myStat = 'SELECT Hum_Out FROM WS_MT1';

        console.log(myStat);

        var myQuery = [
            {
                fieldVal: req.query.timeFrom,
                dbCol: "time",
                op: " >= '",
                adj: req.query.timeFrom
            },
            {
                fieldVal: req.query.timeTo,
                dbCol: "time",
                op: " >= '",
                adj: req.query.timeTo
            }
        ];

        function userQuery() {
            res.setHeader("Access-Control-Allow-Origin", "*");

            con_Wind.query(myStat, function (err, result, fields) {
                var status = [{errStatus: ""}];

                if (err) {
                    console.log(err);
                    status[0].errStatus = "fail";
                    res.send(status);
                    res.end();
                } else if (result.length === 0) {
                    status[0].errStatus = "no data entry";
                    res.send(status);
                    res.end();
                } else {
                    var JSONresult = JSON.stringify(result, null, "\t");
                    console.log(JSONresult);
                    res.send(JSONresult);
                    res.end();
                }
            }).then(result => {
                console.log(result.length);
            res.send(result)
        }).catch(err => {
                res.status(500).send(err.stack)
        });
        }

        var j = 0;

        for (var i = 0; i < myQuery.length; i++) {
            // console.log("i = " + i);
            // console.log("field Value: " + !!myQuery[i].fieldVal);
            if (i === myQuery.length - 1) {
                if (!!myQuery[i].fieldVal) {
                    if (j === 0) {
                        myStat += " WHERE " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                        j = 1;
                        userQuery()
                    } else {
                        myStat += " AND " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                        userQuery()
                    }
                } else {
                    userQuery()
                }
            } else {
                if (!!myQuery[i].fieldVal) {
                    if (j === 0) {
                        myStat += " WHERE " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                        j = 1;
                    } else {
                        myStat += " AND " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
                    }
                }
            }
        }

    });

    var value;
    var startDateTime;
    var endDateTime;

    app.get('/EnergyGraph', function (req, res) {
        value = req.query.keywords;
        startDateTime = req.query.startDateTime;
        endDateTime = req.query.endDateTime;
        //console.log(value);
        //console.log(startDateTime);
        //console.log(endDateTime);

        if (value === "budget") {
            con_EnergyBudget.query('SELECT sum(Electricity_Usage) as Electricity_Usage FROM "FTAA_Energy"."autogen"."Energy_Budget" WHERE time >= 1473120000000000000 and time <= 1504652400000000000 GROUP BY time(1h)').then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            //console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        } else if (value === "actual") {
            con_EnergyPredic.query('SELECT * FROM "FTAA_Energy"."autogen"."Actual_vs_Prediction"').then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            //console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        } else {
            var queryDate = 'SELECT Electricity_Usage, Machine_ID, Machine_Name FROM "FTAA_Energy"."autogen"."Energy_Budget" WHERE time >= ' + "'" + startDateTime + "'" + 'AND time < ' + "'" + endDateTime + "'" + " GROUP BY Machine_ID";
            //console.log(queryDate);
            con_EnergyBudget.query(queryDate).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            //console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

    });


    var value;
    var query1 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Calcium_Ion-Selective_Electrode'";
    var query2 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Ammonium_Ion-Selective_Electrode'";
    var query3 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Potassium_ion-Selective_Electrode'";
    var query4 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Chloride_Probe'";
    var query5 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Colorimeter'";
    var query6 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Turbidity_Sensor'";
    var query7 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'PH_Sensor'";
    var query8 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Temperature_Probe_(C)'";

//console.log(query1);

    app.get('/WaterGraph', function (req, res) {
        value = req.query.keywords;
        console.log(value);
        if (value === "Calcium") {
            con_Water.query(query1).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "Ammonium") {
            con_Water.query(query2).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "Potassium") {
            con_Water.query(query3).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "Chloride") {
            con_Water.query(query4).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "Colorimeter") {
            con_Water.query(query5).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "Turbidity") {
            con_Water.query(query6).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "pH") {
            con_Water.query(query7).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }

        if (value === "Temperature") {
            con_Water.query(query8).then(results => {
                var origin = req.headers.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);

            var JSONresult = JSON.stringify(results, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);
            res.end();
        });
        }
    });

    app.get('/userhome', isLoggedIn, function (req, res) {
        var myStat = "SELECT userrole FROM Users WHERE username = '" + req.user.username + "';";

        con_CS.query(myStat, function (err, results, fields) {
            //console.log(results);

            if (!results[0].userrole) {
                console.log("Error");
            } else {
                res.render('userHome.ejs', {
                    user: req.user // get the user out of session and pass to template
                });
            }
        });
    });

    app.get('/deleteRow2', isLoggedIn, function(req, res) {
        del_recov("Deleted", "Deletion failed!", "/dataHistory", req, res);
    });

    app.get('/recoverRow2', isLoggedIn, function(req, res){
        del_recov("Active", "Recovery failed!", "/dataHistory", req, res);
    });

    app.get('/deleteRow', isLoggedIn, function(req, res) {
        del_recov("Deleted", "Deletion failed!", "/userHome", req, res);
    });

    app.get('/recoverRow', isLoggedIn, function(req, res){
        del_recov("Active", "Recovery failed!", "/userHome", req, res);
    });

    // edit on homepage
    var editTransactionID;
    var editData;
    app.get('/sendEditData', isLoggedIn, function(req, res) {
        editTransactionID = req.query.transactionIDStr;
        console.log(editTransactionID);

        var scoutingStat = "SELECT Users.firstName, Users.lastName, General_Form.*, Detailed_Scouting.* FROM Transaction INNER JOIN Users ON Users.username = Transaction.Cr_UN INNER JOIN General_Form ON General_Form.transactionID = Transaction.transactionID INNER JOIN Detailed_Scouting ON Detailed_Scouting.transactionID = Transaction.transactionID WHERE Transaction.transactionID = '" + editTransactionID +"';";
        var trapStat = "SELECT Users.firstName, Users.lastName, General_Form.*, Detailed_Trap.* FROM Transaction INNER JOIN Users ON Users.username = Transaction.Cr_UN INNER JOIN General_Form ON General_Form.transactionID = Transaction.transactionID INNER JOIN Detailed_Trap ON Detailed_Trap.transactionID = Transaction.transactionID WHERE Transaction.transactionID = '" + editTransactionID + "';";

        con_CS.query(scoutingStat + trapStat, function (err, results, fields) {

            if (err) {
                console.log(err);
                res.json({"error": true, "message": "Fail"});
            } else {
                console.log(results);
                if (results[0].length > 0) {
                    editData = results[0][0];
                    res.json({"error": false, "message": "/editData"});
                } else if (results[1].length > 0) {
                    editData = results[1][0];
                    res.json({"error": false, "message": "/editData"});
                } else {
                    res.json({"error": true, "message": "Fail"});
                }
            }
        });
    });
    app.get('/edit', isLoggedIn, function (req, res) {
        // res.render("test.ejs");
        // console.log("11");
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        var myStat = "SELECT Damage_photo, Damage_photo_name FROM Detailed_Scouting WHERE transactionID = '" + editTransactionID +"';";
        console.log("This is for editing photos ONLY >:( " + editTransactionID);

        var filePath0;
        con_CS.query(myStat, function (err, results) {
            console.log("query statement : " + myStat);

            if (!results[0].Damage_photo && !results[0].Damage_photo_name) {
                console.log("Error");
            } else {
                filePath0 = results[0];
                var JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);
                res.send(JSONresult);
                res.end()
            }
        });
    });
    app.get('/edit2', isLoggedIn, function (req, res) {
        // res.render("test.ejs");
        // console.log("11");
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        var myStat = "SELECT Pest_photo, Pest_photo_name FROM Detailed_Scouting WHERE transactionID = '" + editTransactionID +"';";
        console.log("This is for editing photos ONLY >:( " + editTransactionID);

        var filePath0;
        con_CS.query(myStat, function (err, results) {
            console.log("query statement : " + myStat);

            if (!results[0].Pest_photo && !results[0].Pest_photo_name) {
                console.log("Error");
            } else {
                filePath0 = results[0];
                var JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);
                res.send(JSONresult);
                res.end()
            }
        });
    });
    app.delete("/deleteFiles/:uuid", onDeleteFile);

    app.get('/editData', isLoggedIn, function(req, res) {
        // console.log(editData.transactionID);
        res.render('dataEdit.ejs', {
            user: req.user,
            data: editData, // get the user out of session and pass to template
            message: req.flash('Data Entry Message')
        });
    });

    app.get('/recovery', isLoggedIn, function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('recovery.ejs', {
            user: req.user,
            message: req.flash('restoreMessage')
        });
    });

    app.get('/recovery2', isLoggedIn, function (req, res) {
        // render the page and pass in any flash data if it exists
        res.render('recovery_dataHistory.ejs', {
            user: req.user,
            message: req.flash('restoreMessage')
        });
    });

    // show the data history ejs
    app.get('/dataHistory', isLoggedIn, function (req, res) {
        res.render('dataHistory.ejs', {
            user: req.user // get the user out of session and pass to template
        });
    });

    app.get('/filterQuery', isLoggedIn, function (req, res) {
        var scoutingStat = "SELECT Users.username, Users.firstName, Users.lastName, General_Form.*, Detailed_Scouting.* FROM Transaction INNER JOIN Users ON Users.username = Transaction.Cr_UN INNER JOIN General_Form ON General_Form.transactionID = Transaction.transactionID INNER JOIN Detailed_Scouting ON Detailed_Scouting.transactionID = Transaction.transactionID";
        var trapStat = "SELECT Users.username, Users.firstName, Users.lastName, General_Form.*, Detailed_Trap.* FROM Transaction INNER JOIN Users ON Users.username = Transaction.Cr_UN INNER JOIN General_Form ON General_Form.transactionID = Transaction.transactionID INNER JOIN Detailed_Trap ON Detailed_Trap.transactionID = Transaction.transactionID";
        //console.log(req.query);
        var myQueryObj = [
            {
                fieldVal: req.query.statusDel,
                dbCol: "General_Form.Status_del",
                op: " = '",
                adj: req.query.statusDel,
                table: 1
            },
            {
                fieldVal: req.query.statusDel,
                dbCol: "Detailed_Scouting.Status_del",
                op: " = '",
                adj: req.query.statusDel,
                table: 2
            },
            {
                fieldVal: req.query.statusDel,
                dbCol: "Detailed_Trap.Status_del",
                op: " = '",
                adj: req.query.statusDel,
                table: 3
            },
            {
                fieldVal: req.query.firstName,
                dbCol: "firstName",
                op: " = '",
                adj: req.query.firstName,
                table: 1
            },
            {
                fieldVal: req.query.lastName,
                dbCol: "lastName",
                op: " = '",
                adj: req.query.lastName,
                table: 1
            },
            {
                fieldVal: req.query.startDate,
                dbCol: "date",
                op: " >= '",
                adj: req.query.startDate,
                table: 1
            },
            {
                fieldVal: req.query.endDate,
                dbCol: "date",
                op: " <= '",
                adj: req.query.endDate,
                table: 1
            },
            {
                fieldVal: req.query.content1,
                dbCol: req.query.filter1,
                op: " = '",
                adj: req.query.filter1,
                table: req.query.filter1
            },
            {
                fieldVal: req.query.content2,
                dbCol: req.query.filter2,
                op: " = '",
                adj: req.query.filter2,
                table: req.query.filter2
            },
            {
                fieldVal: req.query.content3,
                dbCol: req.query.filter3,
                op: " = '",
                adj: req.query.filter3,
                table: req.query.filter3
            }
        ];
        QueryStat(myQueryObj, scoutingStat, trapStat, res)
    });

    // Prepare and assign new transaction ID
    app.get('/newEntry', isLoggedIn, function (req, res) {
        var d = new Date();
        var utcDateTime = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);
        var queryTransID = "SELECT COUNT(transactionID) AS number FROM Transaction WHERE transactionID LIKE '" + utcDateTime + "%';";

        con_CS.query(queryTransID, function (err, results, fields) {
            transactionID = utcDateTime + "_" + ('0000' + (results[0].number + 1)).slice(-5);
            if (err) {
                console.log(err);
            } else {
                var insertTransID = "INSERT INTO Transaction (transactionID, Cr_UN) VALUE (" + "'" + transactionID + "', '" + req.user.username + "');";
                con_CS.query(insertTransID, function (err, results, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        // Show general form
                        res.render('form.ejs', {
                            user: req.user, // get the user out of session and pass to template
                            message: req.flash('Data Entry Message'),
                            firstname: req.user.firstName,
                            lastname: req.user.lastName,
                            transactionID: transactionID
                        });
                    }
                });
            }
        });
    });

      // Submit general form
    app.post('/generalForm', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        //console.log(req.body);

        var result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });

        var name = "";
        var value = "";

        for (var i = 0; i < result.length; i++) {
            if (result[i][0] === "Latitude_direction" || result[i][0] === "Longitude_direction") {
                // lati and long
                name += result[i][0].substring(0, result[i][0].length - 10) + ", ";
                value += '"' + result[i][1] + " " + result[i + 1][1] + "° " + result[i + 2][1] + "' " + result[i + 3][1] + "''" + '"' + ", ";
                i = i + 3;
            } else if (result[i][0] === "Field_size_integer") {
                // field size
                name += result[i][0].substring(0, result[i][0].length - 8) + ", ";
                // one decimal place = divide by 10
                value += '"' + (parseFloat(result[i][1]) + (result[i + 1][1] / 10)) + '"' + ", ";
                i = i + 1;
            } else if (result[i][0] === "Rotation_intercropping_crop") {
                name += result[i][0] + ", ";
                var str = result[i][1].toString();
                str = str.replace(/,/g, "/");
                value += '"' + str + '"' + ", ";
            } else {
                // normal
                if (result[i][1] !== "") {
                    name += result[i][0] + ", ";
                    value += '"' + result[i][1] + '"' + ", ";
                }
            }
        }
        name = name.substring(0, name.length - 2);
        value = value.substring(0, value.length - 2);

        // console.log(name);
        // console.log(value);
        var deleteStatement = "DELETE FROM General_Form WHERE transactionID = '" + req.body.transactionID + "'; ";
        var insertStatement = "INSERT INTO General_Form (" + name + ") VALUES (" + value + ");";
        console.log(insertStatement);

        con_CS.query(deleteStatement + insertStatement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "Insert Error! Check your entry."});
            } else {
                res.json({"error": false, "message": "/detailedForm"});
            }
        });
    });

    // Submit detailed form Scouting
    app.post('/detailedFormScouting', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        console.log(req.body);
        var result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });

        var name = "";
        var value = "";

        for (var i = 0; i < result.length; i++) {
            if (result[i][0] === "Pest_stage" || result[i][0] === "Control_undertaken") {
                name += result[i][0] + ", ";
                var str = result[i][1].toString();
                str = str.replace(/,/g, "/");
                value += '"' + str + '"' + ", ";
            } else {
                name += result[i][0] + ", ";
                value += '"' + result[i][1] + '"' + ", ";
            }
        }
        name = name.substring(0, name.length - 2);
        value = value.substring(0, value.length - 2);

        // var path = responseDataUuid.split(";");
        // //console.log(path);
        // var damage = "";
        // var damage_name = "";
        // var pest = "";
        //
        // for (var i = 0; i < path.length - 1; i++) {
        //     console.log("New paths underway!!!!");
        //     if (path[i] === "Damage_photo") {
        //         damage += "https://aworldbridgelabs.com/uploadfiles/" + path[i] + ";";
        //     } else if (path[i] === "Damage_photo_name") {
        //         damage_name += path[i] + ";";
        //     // } else if (path[i].substring(0,10) === "Pest_photo") {
        //     //     pest += "https://aworldbridgelabs.com/uploadfiles/" + path[i] + ";";
        //     }
        // }
        // //console.log(pest + "  " + damage);
        // damage = damage.substring(0, damage.length - 1);
        // damage_name = damage_name.substring(0, damage_name.length - 1);
        // // pest = pest.substring(0, pest.length - 1);
        //
        // name += ", Damage_photo, Damage_photo_name";
        // value += ", '" + damage + "', '" + damage_name + "'";

        var newImage = {
            Damage_photo: "https://aworldbridgelabs.com/uploadfiles/" + responseDataUuid,
            Damage_photo_name: responseDataUuid,
            Pest_photo: "https://aworldbridgelabs.com/uploadfiles/" + responseDataUuid2,
            Pest_photo_name: responseDataUuid2
        };

        console.log("path: " + responseDataUuid + "pest: " + responseDataUuid2);
        console.log("names: " + responseDataUuid + "pest: " + responseDataUuid2);

        name += ", Damage_photo, Damage_photo_name, Pest_photo, Pest_photo_name";
        value += ", '" + newImage.Damage_photo + "', '" + newImage.Damage_photo_name + "', '" + newImage.Pest_photo + "', '" + newImage.Pest_photo_name + "'";

        var deleteStatement = "DELETE FROM Detailed_Scouting WHERE transactionID = '" + req.body.transactionID + "'; ";
        var insertStatement = "INSERT INTO Detailed_Scouting (" + name + ") VALUES (" + value + ");";
        console.log(insertStatement);

        con_CS.query(deleteStatement + insertStatement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "Insert Error! Check your entry."});
            } else {
                res.json({"error": false, "message": "/detailedForm"});
            }
        });
    });

    // Submit detailed form trap
    app.post('/detailedFormTrap', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        console.log(req.body);
        var result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });

        var name = "";
        var value = "";

        for (var i = 0; i < result.length; i++) {
            name += result[i][0] + ", ";
            value += '"' + result[i][1] + '"' + ", ";
        }
        name = name.substring(0, name.length - 2);
        value = value.substring(0, value.length - 2);

        var deleteStatement = "DELETE FROM Detailed_Trap WHERE transactionID = '" + req.body.transactionID + "'; ";
        var insertStatement = "INSERT INTO Detailed_Trap (" + name + ") VALUES (" + value + ");";
        console.log(insertStatement);

        con_CS.query(deleteStatement + insertStatement, function (err, results, fields) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "Insert Error! Check your entry."});
            } else {
                res.json({"error": false, "message": "/detailedForm"});
            }
        });
    });

    // =====================================
    // SIGNOUT =============================
    // =====================================
    //shouw the signout form
    app.get('/signout', function (req, res) {
        req.session.destroy();
        req.logout();
        res.redirect('/login');
    });
    app.get('/scanner',function (req,res) {
        res.render('scanner.ejs')
    });

    app.get('Cancel', function (req, res) {
        res.redirect('/userHome');
        res.render('userHome', {
            user: req.user // get the user out of session and pass to template
        });
    });

};

// route middleware to make sure
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the bak page
    res.redirect('/');
}

function dateNtime() {
    today = new Date();
    date2 = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    time2 = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    dateTime = date2 + ' ' + time2;
}

function tokenExpTime() {
    today = new Date();
    date3 = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + (today.getDate()+1);
    time3 = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    tokenExpire = date3 + ' ' + time3;
}

function del_recov(StatusUpd, ErrMsg, targetURL, req, res) {

    transactionID = req.query.transactionIDStr.split(",");
    console.log(transactionID);
    var statementGeneral = "UPDATE General_Form SET Status_del = '" + StatusUpd + "'";
    var statementDetailedS = "UPDATE Detailed_Scouting SET Status_del = '" + StatusUpd + "'";
    var statementDetailedT = "UPDATE Detailed_Trap SET Status_del = '" + StatusUpd + "'";

    for (var i = 0; i < transactionID.length; i++) {
        if (i === 0) {
            statementGeneral += " WHERE transactionID = '" + transactionID[i] + "'";
            statementDetailedS += " WHERE transactionID = '" + transactionID[i] + "'";
            statementDetailedT += " WHERE transactionID = '" + transactionID[i] + "'";

            if (i === transactionID.length - 1) {
                statementGeneral += ";";
                statementDetailedS += ";";
                statementDetailedT += ";";
                myStat = statementGeneral + statementDetailedS + statementDetailedT;
                updateDBNres(myStat, "", ErrMsg, targetURL, res);
            }
        } else {
            statementGeneral += " OR transactionID = '" + transactionID[i] + "'";
            statementDetailedS += " OR transactionID = '" + transactionID[i] + "'";
            statementDetailedT += " OR transactionID = '" + transactionID[i] + "'";

            if (i === transactionID.length - 1) {
                statementGeneral += ";";
                statementDetailedS += ";";
                statementDetailedT += ";";
                myStat = statementGeneral + statementDetailedS + statementDetailedT;
                updateDBNres(myStat, "", ErrMsg, targetURL, res);
            }
        }
    }
}

function updateDBNres(SQLstatement, Value, ErrMsg, targetURL, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    //console.log("Query Statement: " + SQLstatement);

    con_CS.query(SQLstatement, Value, function (err, rows) {
        if (err) {
            console.log(err);
            res.json({"error": true, "message": ErrMsg});
        } else { res.json({"error": false, "message": targetURL});}
    })
}

function updateDBNredir(SQLstatement, Value, ErrMsg, failURL, redirURL, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    //console.log("Query Statement: " + SQLstatement);

    con_CS.query(SQLstatement, Value, function (err, rows) {
        if (err) {
            console.log(err);
            res.render(failURL, {message: req.flash(ErrMsg)});
        } else {
            res.redirect(redirURL);
            // render the page and pass in any flash data if it exists
        }
    })
}

function QueryStat(myObj, scoutingStat, trapStat, res) {
    var j = 0;
    for (var i = 0; i < myObj.length; i++) {
        //console.log("i = " + i);
        //console.log("field Value: " + !!myObj[i].fieldVal);
        if (!!myObj[i].adj){
            if (i === 7 || i === 8 || i === 9) {
                myObj[i].dbCol = myObj[i].dbCol.substring(1, myObj[i].dbCol.length);
                myObj[i].table = parseInt(myObj[i].table.substring(0, 1));
            }

            var aw;
            if (j === 0) {
                aw = " WHERE ";
                j = 1;
            } else {
                aw = " AND ";
            }

            if (myObj[i].table === 1) {
                scoutingStat = editStat(scoutingStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
                trapStat = editStat(trapStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
            } else if (myObj[i].table === 2) {
                scoutingStat = editStat(scoutingStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
            } else if (myObj[i].table === 3) {
                trapStat = editStat(trapStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
            }

            if (i === myObj.length - 1) {
                var sqlStatement = scoutingStat + "; " + trapStat;
                dataList(sqlStatement, res);
            }
        } else {
            if (i === myObj.length - 1) {
                var sqlStatement = scoutingStat + "; " + trapStat;
                dataList(sqlStatement, res);
            }
        }
    }

    function editStat(stat, aw, dbCol, op, fieldVal) {
        stat += aw + dbCol + op + fieldVal + "'";
        return stat;
    }
}

function dataList(sqlStatement, res) {
    console.log(sqlStatement);

    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    con_CS.query(sqlStatement, function (err, results, fields) {

        errStatus = [{errMsg: ""}];

        if (err) {
            console.log(err);
            errStatus[0].errMsg = "fail";
            res.send(errStatus);
            res.end();
        } else if (results[0].length === 0 && results[1].length === 0) {
            errStatus[0].errMsg = "no data entry";
            res.send(errStatus);
            res.end();
        } else {
            var result = results[0].concat(results[1]);
            var JSONresult = JSON.stringify(result, null, "\t");
            // console.log(JSONresult);
            res.send(JSONresult);
            res.end();
        }
    });
}

function changeMail(str) {
    var spliti = str.split("@");
    var letter1 = spliti[0].substring(0, 1);
    var letter2 = spliti[0].substring(spliti[0].length - 1, spliti[0].length);
    var newFirst = letter1;
    for(i = 0; i < spliti[0].length - 2; i++) {
        newFirst += "*";
    }
    newFirst += letter2;

    var letter3 = spliti[1].substring(0, 1);
    var extension = letter3;
    for(i = 0; i < spliti[1].split(".")[0].length - 1; i++) {
        extension += "*";
    }
    extension += "." + spliti[1].split(".")[1];
    var result = newFirst + "@" + extension;

    return result;
}

function onUpload(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    console.log (req.headers.origin);

    var form = new multiparty.Form();

    form.parse(req, function(err, fields, files) {
        console.log(fields);
        console.log("A");
        var partIndex = fields.qqpartindex;

        // text/plain is required to ensure support for IE9 and older
        res.set("Content-Type", "text/plain");

        if (partIndex == null) {
            onSimpleUpload(fields, files[fileInputName][0], res);
        }
        else {
            onChunkedUpload(fields, files[fileInputName][0], res);
        }
    });
    console.log("the other: " + responseDataUuid);

    // return next();
}

var responseDataUuid = "",
    responseDataName = "",
    responseDataUuid2 = "",
    responseDataName2 = "";
function onSimpleUpload(fields, file, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
    responseDataUuid = "";

    var d = new Date(),
        uuid = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2) + "T" + ('0' + d.getUTCHours()).slice(-2) + ":" + ('0' + d.getUTCMinutes()).slice(-2) + ":" + ('0' + d.getUTCSeconds()).slice(-2) + "Z",
        responseData = {
            success: false,
            newuuid: uuid + "_" + fields.qqfilename
            // newuuid2: uuid + "_" + fields.qqfilename
        };

    responseDataUuid = responseData.newuuid;
    // responseDataUuid2 = responseData.newuuid2;

    file.name = fields.qqfilename;
    responseDataName = file.name;
    responseDataName2 = file.name;

    console.log("forth hokage: " + responseDataUuid);
    console.log("fifth harmony: " + responseDataName);
    console.log("trials 4 days: " + responseDataUuid2);
    console.log("pentatonic success: " + responseDataName2);

    if (isValid(file.size)) {
        moveUploadedFile(file, uuid, function() {
                responseData.success = true;
                res.send(responseData);
            },
            function() {
                responseData.error = "Problem copying the file!";
                res.send(responseData);
            });
    }
    else {
        failWithTooBigFile(responseData, res);
    }
}

function onChunkedUpload(fields, file, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

    console.log("Z");
    var size = parseInt(fields.qqtotalfilesize),
        uuid = fields.qquuid,
        index = fields.qqpartindex,
        totalParts = parseInt(fields.qqtotalparts),
        responseData = {
            success: false
        };

    file.name = fields.qqfilename;

    if (isValid(size)) {
        storeChunk(file, uuid, index, totalParts, function() {
                if (index < totalParts - 1) {
                    responseData.success = true;
                    res.send(responseData);
                }
                else {
                    combineChunks(file, uuid, function() {
                            responseData.success = true;
                            res.send(responseData);
                        },
                        function() {
                            responseData.error = "Problem conbining the chunks!";
                            res.send(responseData);
                        });
                }
            },
            function(reset) {
                responseData.error = "Problem storing the chunk!";
                res.send(responseData);
            });
    }
    else {
        failWithTooBigFile(responseData, res);
    }
}

function failWithTooBigFile(responseData, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

    responseData.error = "Too big!";
    responseData.preventRetry = true;
    res.send(responseData);
}

function onDeleteFile(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

    var uuid = req.params.uuid,
        dirToDelete = "uploadfiles/" + uuid;
    console.log(uuid);
    rimraf(dirToDelete, function(error) {
        if (error) {
            console.error("Problem deleting file! " + error);
            res.status(500);
        }

        res.send();
    });
}

function isValid(size) {
    return maxFileSize === 0 || size < maxFileSize;
}

function moveFile(destinationDir, sourceFile, destinationFile, success, failure) {
    console.log(destinationDir);
    mkdirp(destinationDir, function(error) {
        var sourceStream, destStream;

        if (error) {
            console.error("Problem creating directory " + destinationDir + ": " + error);
            failure();
        }
        else {
            sourceStream = fs.createReadStream(sourceFile);
            destStream = fs.createWriteStream(destinationFile);

            sourceStream
                .on("error", function(error) {
                    console.error("Problem copying file: " + error.stack);
                    destStream.end();
                    failure();
                })
                .on("end", function(){
                    destStream.end();
                    success();
                })
                .pipe(destStream);
        }
    });
}

function moveUploadedFile(file, uuid, success, failure) {
    console.log("this is: " + uuid);
    // var destinationDir = uploadedFilesPath + uuid + "/",
    var destinationDir = "uploadfiles/",
        fileDestination = destinationDir + uuid + "_" + file.name;

    moveFile(destinationDir, file.path, fileDestination, success, failure);
}

function storeChunk(file, uuid, index, numChunks, success, failure) {
    var destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        chunkFilename = getChunkFilename(index, numChunks),
        fileDestination = destinationDir + chunkFilename;

    moveFile(destinationDir, file.path, fileDestination, success, failure);
}

function combineChunks(file, uuid, success, failure) {
    var chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        destinationDir = uploadedFilesPath + uuid + "/",
        fileDestination = destinationDir + file.name;


    fs.readdir(chunksDir, function(err, fileNames) {
        var destFileStream;

        if (err) {
            console.error("Problem listing chunks! " + err);
            failure();
        }
        else {
            fileNames.sort();
            destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

            appendToStream(destFileStream, chunksDir, fileNames, 0, function() {
                    rimraf(chunksDir, function(rimrafError) {
                        if (rimrafError) {
                            console.log("Problem deleting chunks dir! " + rimrafError);
                        }
                    });
                    success();
                },
                failure);
        }
    });
}

function appendToStream(destStream, srcDir, srcFilesnames, index, success, failure) {
    if (index < srcFilesnames.length) {
        fs.createReadStream(srcDir + srcFilesnames[index])
            .on("end", function() {
                appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
            })
            .on("error", function(error) {
                console.error("Problem appending chunk! " + error);
                destStream.end();
                failure();
            })
            .pipe(destStream, {end: false});
    }
    else {
        destStream.end();
        success();
    }
}

function getChunkFilename(index, count) {
    var digits = new String(count).length,
        zeros = new Array(digits + 1).join("0");

    return (zeros + index).slice(-digits);
}