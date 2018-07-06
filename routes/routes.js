// routes/routes.js
const mysql = require('mysql');
const config = require('../config/mainconf');
const con_CS = mysql.createConnection(config.commondb_connection);
const uploadPath = config.Upload_Path;
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const nodemailer = require('nodemailer');
const Influx = require('influx');
const cors = require('cors');
const async = require('async');
const crypto = require('crypto');
const fs = require("fs");
const rimraf = require("rimraf");
const mkdirp = require("mkdirp");
const multiparty = require('multiparty');

const fileInputName = process.env.FILE_INPUT_NAME || "qqfile";
const maxFileSize = process.env.MAX_FILE_SIZE || 0; // in bytes, 0 for unlimited

let transactionID, myStat, myVal, myErrMsg, token, errStatus, mylogin;
let today, date2, date3, time2, time3, dateTime, tokenExpire;

const smtpTrans = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'aaaa.zhao@g.feitianacademy.org',
        pass: "12344321"
    }
});

con_CS.query('USE ' + config.Login_db); // Locate Login DB

const con_Water = new Influx.InfluxDB({
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

const con_EnergyBudget = new Influx.InfluxDB({
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

const con_EnergyPredic = new Influx.InfluxDB({
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

const con_Wind = new Influx.InfluxDB({
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
    // CS APP Home Section =================
    // =====================================
    app.get('/app', function (req, res) {
        res.render('CitySmartV2.ejs');
    });

    // =====================================
    // LOGIN Section =======================
    // =====================================

    app.get('/request', function (req, res) {
        res.redirect('/login');
    });

    app.get('/', function (req, res) {
        res.redirect('/login');
    });

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

        myStat = "UPDATE UserLogin SET status = 'Active', lastLoginTime = ? WHERE username = ?";
        myVal = [dateTime, req.user.username];
        myErrMsg = "Please try to login again";
        updateDBNredir(myStat, myVal, myErrMsg, "login.ejs", "/userhome", res);
    });

    app.get('/forgot', function (req, res) {
        res.render('forgotPassword.ejs', {message: req.flash('forgotPassMessage')});

    });

    app.post('/email', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let statement = "SELECT * FROM UserLogin WHERE username = '" + req.body.username + "';";
        //console.log(statement);

        con_CS.query(statement, function (err, results, fields) {
            if (err) {
                // console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
            } else if (results.length === 0) {
                res.json({"error": true, "message": "Please verify your email address !"});
            } else {
                var username = req.body.username;
                var subject = "Passwprd Reset";
                var text = 'the reset of the password for your account.';
                var url = "http://" + req.headers.host + "/reset/";
                sendToken(username, subject, text, url, res);
            }
        });
    });

    app.get('/reset/:token', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";

        con_CS.query(myStat, function (err, user) {
            dateNtime();

            if (!user || dateTime > user[0].resetPasswordExpires) {
                res.send('Password reset token is invalid or has expired. Please contact Administrator.');
            } else {
                res.render('reset.ejs', {user: user[0]});
            }
        });
    });

    app.post('/reset/:token', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        async.waterfall([
            function (done) {

                myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";

                con_CS.query(myStat, function (err, user) {
                    let userInfo = JSON.stringify(user, null, "\t");

                    if (!user) {
                        res.json({"error": true, 'message': 'Password reset token is invalid or has expired. Please contact Administrator.'});
                    } else {
                        let newPass = {
                            Newpassword: bcrypt.hashSync(req.body.newpassword, null, null),
                            ConfirmPassword: bcrypt.hashSync(req.body.Confirmpassword, null, null)
                        };

                        let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + req.body.username + "'";

                        con_CS.query(passReset, function (err, rows) {
                            if (err) {
                                console.log(err);
                                res.json({"error": true, "message": "New Password Insert Fail!"});
                            } else {
                                var username = req.body.username;
                                var subject = "Your password has been changed";
                                var text = 'Hello,\n\n' + 'This is a confirmation that the password for your account, ' + changeMail(username) + ' has just been changed.\n';
                                done(err, username, subject, text);
                            }
                        });
                    }

                });
            }, function (user, done, err) {

                let message = {
                    from: 'FTAA <aaaa.zhao@g.feitianacademy.org>',
                    to: req.body.username,
                    subject: 'Your password has been changed',
                    text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account, ' + changeMail(req.body.username) + ' has just been changed.\n'
                };

                smtpTrans.sendMail(message, function (error) {
                    if (error) {
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

    //show the signout form
    app.get('/signout', function (req, res) {
        req.session.destroy();
        req.logout();
        res.redirect('/login');
    });

    // =====================================
    // USER Home Section ===================
    // =====================================
    app.get('/userhome', isLoggedIn, function (req, res) {
        let myStat = "SELECT userrole FROM UserLogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";

        con_CS.query(myStat + state2, function (err, results, fields) {
            if (!results[0][0].userrole) {
                console.log("Error2");
            } else if (!results[1][0].firstName) {
                console.log("Error1")
            } else {
                res.render('userHome.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[1][0].firstName
                });
            }
        });
    });

    app.get('/deleteRow', isLoggedIn, function (req, res) {
        del_recov("Delete", "Deletion failed!", "/userHome", req, res);
    });

    app.get('/recoverRow', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        del_recov("Active", "Recovery failed!", "/userHome", req, res);
        let pictureStr = req.query.pictureStr.split(',');
        // mover folder
        for(let i = 0; i < pictureStr.length; i++) {
            fs.rename("./a/" + pictureStr[i] + "" , "./b/" + pictureStr[i] + "", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("success");
                }
            });
        }
    });

    // =====================================
    // REQUEST QUERY   =====================
    // =====================================
    app.get('/deleteRow2', isLoggedIn, function (req, res) {
        del_recov("Delete", "Deletion failed!", "/dataHistory", req, res);
    });

    app.get('/recoverRow2', isLoggedIn, function (req, res) {
        del_recov("Active", "Recovery failed!", "/dataHistory", req, res);
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

        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";

        con_CS.query(state2, function (err, results, fields) {
            // console.log(results);
            if (!results[0].firstName) {
                console.log("Error2");
            } else {
                res.render('dataHistory.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[0].firstName //get the firstName our of session ans pass to template
                });
            }
        });

    });

    app.get('/filterQuery', isLoggedIn, function (req, res) {
        var scoutingStat = "SELECT UserProfile.firstName, UserProfile.lastName, Request_Form.* FROM Request_Form INNER JOIN UserProfile ON UserProfile.username = Request_Form.UID";
        // var trapStat = "SELECT UserProfile.username, UserProfile.firstName, UserProfile.lastName, General_Form.*, Detailed_Trap.* FROM Transaction INNER JOIN Users ON UserProfile.username = Transaction.Cr_UN INNER JOIN General_Form ON General_Form.transactionID = Transaction.transactionID INNER JOIN Detailed_Trap ON Detailed_Trap.transactionID = Transaction.transactionID";
        // console.log(req.query);
        var myQueryObj = [
            // {
            //     fieldVal: req.query.statusDel,
            //     dbCol: "General_Form.Status_del",
            //     op: " = '",
            //     adj: req.query.statusDel,
            //     table: 1
            // },
            // {
            //     fieldVal: req.query.statusDel,
            //     dbCol: "Detailed_Scouting.Status_del",
            //     op: " = '",
            //     adj: req.query.statusDel,
            //     table: 2
            // },
            // {
            //     fieldVal: req.query.statusDel,
            //     dbCol: "Detailed_Trap.Status_del",
            //     op: " = '",
            //     adj: req.query.statusDel,
            //     table: 3
            // },
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
            // {
            //     fieldVal: req.query.startDate,
            //     dbCol: "date",
            //     op: " >= '",
            //     adj: req.query.startDate,
            //     table: 1
            // },
            // {
            //     fieldVal: req.query.endDate,
            //     dbCol: "date",
            //     op: " <= '",
            //     adj: req.query.endDate,
            //     table: 1
            // },
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
            },
            {
                fieldVal: req.query.status,
                dbCol: "Status",
                op: " = '",
                adj: req.query.status,
                table: 1
            }
        ];
        QueryStat(myQueryObj, scoutingStat, res)
    });

    // =====================================
    // USER PROFILE  =======================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    // Show user profile page
    app.get('/profile', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT * FROM UserProfile", function (err, results) {
            if (err) throw err;
            res.json(results);
        })
    });


    app.get('/userProfile', isLoggedIn, function (req, res) {
        res.render('userProfile.ejs', {user: req.user});
    });

    // Update user profile page
    app.post('/userProfile', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let user = req.user;
        let newPass = {
            firstname: req.body.usernameF,
            lastname: req.body.usernameL,
            currentpassword: req.body.currentpassword,
            Newpassword: bcrypt.hashSync(req.body.newpassword, null, null),
            ConfirmPassword: bcrypt.hashSync(req.body.Confirmpassword, null, null)
        };

        dateNtime();

        myStat = "UPDATE UserProfile SET firstName =?, lastName = ? ";
        mylogin = "UPDATE UserLogin SET dateModified  = ? WHERE username = ? ";
        myVal = [newPass.firstname, newPass.lastname, dateTime, user.username];

        con_CS.query(myStat, myVal, mylogin, function (err, rows) {
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "Fail !"});
            } else {
                let passComp = bcrypt.compareSync(newPass.currentpassword, user.password);
                if (!!req.body.newpassword && passComp) {
                    let passReset = "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + user.username + "'";

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

    // Show user management home page
    app.get('/userManagement', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        myStat = "SELECT userrole FROM UserLogin WHERE username = '" + req.user.username + "';";
        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";

        con_CS.query(myStat + state2, function (err, results, fields) {

            if (!results[0][0].userrole) {
                console.log("Error2");
            } else if (!results[1][0].firstName) {
                console.log("Error1")
            } else if (results[0][0].userrole === "Admin" || "Regular") {
                // process the signup form
                res.render('userManagement.ejs', {
                    user: req.user, // get the user out of session and pass to template
                    firstName: results[1][0].firstName
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

        let newUser = {
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
        // console.log(newUser);
        myStat = "INSERT INTO CitySmart.UserLogin ( username, password, userrole, dateCreated, dateModified, createdUser, status) VALUES ( '" + newUser.username + "','" + newUser.password+ "','" + newUser.userrole+ "','" + newUser.dateCreated+ "','" + newUser.dateModified+ "','" + newUser.createdUser + "','" + newUser.status + "');";
        mylogin = "INSERT INTO CitySmart.UserProfile ( username, firstName, lastName) VALUES ('"+ newUser.username + "','" + newUser.firstName+ "','" + newUser.lastName + "');";
        con_CS.query(myStat + mylogin, function (err, rows) {
            //newUser.id = rows.insertId;
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
                res.end();
            } else {
                var username = req.body.username;
                var subject = "Sign Up";
                var text = 'to sign up an account with this email.';
                var url = "http://" + req.headers.host + "/verify/";
                sendToken(username, subject, text, url, res);
            }
        });
    });

        // show the addUser form
        app.get('/addUser', isLoggedIn, function (req, res) {
            // render the page and pass in any flash data if it exists
            res.render('addUser.ejs', {
                user: req.user,
                message: req.flash('addUserMessage')
            });
        });

    app.post('/addUser', isLoggedIn, function (req, res) {

        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // connection.query('USE ' + config.Login_db); // Locate Login DB

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

        myStat = "INSERT INTO CitySmart.UserLogin ( username, password, userrole, dateCreated, dateModified, createdUser, status) VALUES ( '" + newUser.username + "','" + newUser.password+ "','" + newUser.userrole+ "','" + newUser.dateCreated+ "','" + newUser.dateModified+ "','" + newUser.createdUser + "','" + newUser.status + "');";
        mylogin = "INSERT INTO CitySmart.UserProfile ( username, firstName, lastName) VALUES ('"+ newUser.username + "','" + newUser.firstName+ "','" + newUser.lastName + "');";
        con_CS.query(myStat + mylogin, function (err, rows) {
            //newUser.id = rows.insertId;
            if (err) {
                console.log(err);
                res.json({"error": true, "message": "An unexpected error occurred !"});
                res.end();
            } else {
                res.json({"error": false, "message": "Success"});
            }
        });
    });

    app.get('/verify/:token', function(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        async.waterfall([
            function(done) {
                myStat = "SELECT * FROM UserLogin WHERE resetPasswordToken = '" + req.params.token + "'";
                connection.query(myStat, function(err, results) {
                    dateNtime();

                    if (results.length === 0 || dateTime > results[0].expires) {
                        res.send('Password reset token is invalid or has expired. Please contact Administrator.');
                    } else {
                        done(err, results[0].username);
                    }
                });
            }, function(username, done) {
                myStat = "UPDATE UserLogin SET status = 'Never Logged In' WHERE username = '" + username + "';";

                connection.query(myStat, function(err, user) {
                    if (err) {
                        console.log(err);
                        res.send("An unexpected error occurred !");
                    } else {
                        var subject = "Account Activated";
                        var text = 'Hello,\n\n' + 'This is a confirmation for your account, ' + changeMail(username) + ' has just been activated.\n';
                        done(err, username, subject, text);
                    }

                });
            }, function(username, subject, text) {
                successMail(username, subject, text, res);
            }
        ]);
    });

    // Filter by search criteria
    app.get('/filterUser', isLoggedIn, function (req, res) {
        // res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        myStat = "SELECT UserProfile.*, UserLogin.* FROM UserLogin INNER JOIN UserProfile ON UserLogin.username = UserProfile.username";

        let myQuery = [
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
                fieldVal: req.query.userrole,
                dbCol: "userrole",
                op: " = '",
                adj: req.query.userrole
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
                fieldVal: req.query.status,
                dbCol: "Status",
                op: " = '",
                adj: req.query.status
            },
            {
                fieldVal: req.query.Phone_Number,
                dbCol: "Phone_Number",
                op: " = '",
                adj: req.query.Phone_Number
            }
        ];
        // console.log(req.query.status);
        QueryStat(myQuery, myStat, res);

        // function userQuery() {
        //     res.setHeader("Access-Control-Allow-Origin", "*");
        //
        //     con_CS.query(myStat, function (err, results, fields) {
        //
        //         let status = [{errStatus: ""}];
        //
        //         if (err) {
        //             console.log(err);
        //             status[0].errStatus = "fail";
        //             res.send(status);
        //             res.end();
        //         } else if (results.length === 0) {
        //             status[0].errStatus = "no data entry";
        //             res.send(status);
        //             res.end();
        //         } else {
        //             let JSONresult = JSON.stringify(results, null, "\t");
        //             // console.log(JSONresult);
        //             res.send(JSONresult);
        //             res.end();
        //         }
        //     });
        // }

        // let j = 0;
        //
        // for (let i = 0; i < myQuery.length; i++) {
        //     // console.log("i = " + i);
        //     // console.log("field Value: " + !!myQuery[i].fieldVal);
        //     if (i === myQuery.length - 1) {
        //         if (!!myQuery[i].fieldVal) {
        //             if (j === 0) {
        //                 myStat += " WHERE " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
        //                 j = 1;
        //                 userQuery()
        //             } else {
        //                 myStat += " AND " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
        //                 userQuery()
        //             }
        //         } else {
        //             userQuery()
        //         }
        //     } else {
        //         if (!!myQuery[i].fieldVal) {
        //             if (j === 0) {
        //                 myStat += " WHERE " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
        //                 j = 1;
        //             } else {
        //                 myStat += " AND " + myQuery[i].dbCol + myQuery[i].op + myQuery[i].fieldVal + "'";
        //             }
        //         }
        //     }
        // }
    });

    // Retrieve user data from user management page
    let edit_User, edit_firstName, edit_lastName, edit_userrole, edit_status, edit_city;
    app.get('/editUserQuery', isLoggedIn, function (req, res) {

        // edit_User = req.query.Username;
        edit_firstName = req.query.First_Name;
        edit_city = req.query.City;
        edit_lastName = req.query.Last_Name;
        edit_userrole = req.query.User_Role;
        edit_status = req.query.Status;
        // console.log("1" + edit_city);

        res.json({"error": false, "message": "/editUser"});
    });

    // Show user edit form
    app.get('/editUser', isLoggedIn, function (req, res) {
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

    app.post('/editUser', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header

        if (req.body.newPassword !== "") {
            let updatedUserPass = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status,
                newPassword: bcrypt.hashSync(req.body.newPassword, null, null)
            };

            myStat = "UPDATE UserLogin SET password = ?, userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "' WHERE username = ?";
            mylogin = "UPDATE UserProfile SET firstName = ?, lastName = ?";
            myVal = [updatedUserPass.firstName, updatedUserPass.lastName, updatedUserPass.newPassword, updatedUserPass.userrole, updatedUserPass.status, edit_User];
            updateDBNres(myStat, myVal, mylogin, "Update failed!", "/userManagement", res);

        } else {
            let updatedUser = {
                firstName: req.body.First_Name,
                lastName: req.body.Last_Name,
                userrole: req.body.User_Role,
                status: req.body.Status
            };

            myStat = "UPDATE UserLogin SET userrole = ?, status = ?, modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "'  WHERE username = ?";
            mylogin = "UPDATE UserProfile SET firstName = ?, lastName = ?";
            myVal = [updatedUser.firstName, updatedUser.lastName, updatedUser.userrole, updatedUser.status, edit_User];

            updateDBNres(myStat, myVal, mylogin, "Update failed!", "/userManagement", res);
        }

    });

    app.get('/suspendUser', isLoggedIn, function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        dateNtime();

        let username = req.query.usernameStr.split(",");
        // console.log(username);
        myStat = "UPDATE UserLogin SET modifiedUser = '" + req.user.username + "', dateModified = '" + dateTime + "',  status = 'Suspended'";

        for (let i = 0; i < username.length; i++) {
            if (i === 0) {
                myStat += " WHERE username = '" + username[i] + "'";
                // console.log(myStat);
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

    app.get('/recovery', isLoggedIn, function (req, res) {
        let state2 = "SELECT firstName FROM UserProfile WHERE username = '" + req.user.username + "';";
        con_CS.query(state2, function (err, results, fields) {
            // console.log(results);
            if (!results[0].firstName) {
                console.log("Error2");
            } else {
                res.render('recovery.ejs', {
                    user: req.user,
                    message: req.flash('restoreMessage'),
                    firstName: results[0].firstName
                });
            }
        });
    });

    // =====================================
    // REQUEST FORM SECTION =================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)

    app.post('/upload', onUpload);

    app.post('/submit', function (req, res) {
        // console.log(req.body);
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        // console.log (result);
        res.setHeader("Access-Control-Allow-Origin", "*");

        let name = "";
        let valueSubmit = "";

        for (let i = 0; i < result.length; i++) {
            if (i === result.length - 1) {
                name += result[i][0];
                valueSubmit += '"' + result[i][1] + '"';
            } else {
                name += result[i][0] + ", ";
                valueSubmit += '"' + result[i][1] + '"' + ", ";
            }

        }
        // let newImage = {
        //     Layer_Uploader: "http://localhost:9086/uploadfiles/" + responseDataUuid,
        //     Layer_Uploader_name: responseDataUuid
        // };
        // name += ", Layer_Uploader, Layer_Uploader_name";
        // value += ", '" + newImage.Layer_Uploader + "','" +newImage.Layer_Uploader_name + "'";
        // "UPDATE UserLogin SET password = '" + newPass.Newpassword + "' WHERE username = '" + req.body.username + "'";
        //
        //
        // let statement1 = "INSERT INTO CitySmart.New_Users (" + name + ") VALUES (" + value + ");";
        // // console.log(statement1);
        // let statement1 = "UPDATE CitySmart.UserProfile SET '" + name + " = (" + value + ");"
        // console.log(statement1);

        con_CS.query(statement1, function (err, result) {
            if (err) {
                throw err;
            } else {
                res.json("Connected!")
            }
        });

    });

    //Submit Request form//
    app.post('/submitL', function (req, res) {
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        res.setHeader("Access-Control-Allow-Origin", "*");

        let name = "";
        let valueSubmit = "";

        for (let i = 0; i < result.length; i++) {
            if (i === result.length - 1) {
                name += result[i][0];
                valueSubmit += '"' + result[i][1] + '"';
            } else {
                name += result[i][0] + ", ";
                valueSubmit += '"' + result[i][1] + '"' + ", ";
            }
        }
        // console.log("??0"+valueSubmit);
        let newImage = {
            Layer_Uploader: "http://localhost:63342/NASACitySmart-V2/a/" + responseDataUuid,
            Layer_Uploader_name: responseDataUuid
        };
        name += ", Layer_Uploader, Layer_Uploader_name";
        valueSubmit += ", '" + newImage.Layer_Uploader + "','" + newImage.Layer_Uploader_name + "'";
        let filepathname = "http://localhost:63342/NASACitySmart-V2/a/" + responseDataUuid;


        let statement2 = "INSERT INTO CitySmart.Request_Form (" + name + ") VALUES (" + valueSubmit + ");";
        // console.log(statement2);

        con_CS.query(statement2, function (err, result) {
            if (err) {
                throw err;
            } else {
                res.json("Connected!")
            }
        });

    });
    app.get('/RID', isLoggedIn, function (req, res) {

    });
    //Request ID//
    app.get('/newRequest', isLoggedIn, function (req, res) {

        var d = new Date();
        var utcDateTime = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);
        var queryRID = "SELECT COUNT(RID) AS number FROM Special_ID WHERE RID LIKE '" + utcDateTime + "%';";

        con_CS.query(queryRID, function (err, results, fields) {
            RID = utcDateTime + "_" + ('000' + (results[0].number + 1)).slice(-4);
            if (err) {
                console.log(err);
            } else {
                // console.log(req.user);
                var insertRID = "INSERT INTO Special_ID (RID, UID) VALUE (" + "'" + RID + "', '" + req.user + "');";

                con_CS.query(insertRID, function (err, results, fields) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(req.user);
                        res.render('Layer Request Form.ejs', {
                            user: req.user, // get the user out of session and pass to template
                            RID: RID
                        });
                        // console.log(RID);
                    }
                });
            }
        });
    });


    //Request form layer category//
    app.get('/MainCategory', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT FirstLayer, SecondLayer FROM Request_Form GROUP BY FirstLayer, SecondLayer", function (err, results) {
            if (err) throw err;
            res.json(results);
            // console.log(results);
        });
    });

    // app.get('/Subcategory',function (req,res) {
    //     res.setHeader("Access-Control-Allow-Origin", "*");
    //     con_CS.query('SELECT FirstLayer, SecondLayer COUNT (*) AS count FROM Request_Form GROUP BY FirstLayer, SecondLayer',function (err,results,fields) {
    //         if (err) throw err;
    //         res.json(results);
    //         console.log(results);
    //
    //     });
    // });

    //check if the layer name is available
    app.get('/SearchLayerName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM LayerMenu", function (err, results) {
            if (err) throw err;
            res.json(results);

        });
    });

    app.delete("/deleteFiles/:uuid", onDeleteFile);

    // app.get('/recover',function (req,res) {
    //     res.setHeader("Access-Control-Allow-Origin", "*");
    //     let recoverIDStr = req.query.recoverIDStr;
    //     console.log(recoverIDStr);
    //     for(let i = 0; i < recoverIDStr.length; i++) {
    //         let statement = "UPDATE CitySmart.LayerMenu SET Status = 'Active' WHERE ID = '" + recoverIDStr[i] + "'";
    //         con_CS.query(statement, function (err, results) {
    //             if (err) throw err;
    //             res.json(results[i]);
    //         });
    //     }
    // });

    app.get('/approve', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let approveIDStr = req.query.tID;
        let approvepictureStr = req.query.LUN.split(',');

        let statement = "UPDATE CitySmart.Request_Form SET Status = 'Active' WHERE RID = '" + approveIDStr + "'";

       // mover folder
        for(let i = 0; i < approvepictureStr.length; i++) {
            fs.rename("./a/" + approvepictureStr[i] + "" , "./b/" + approvepictureStr[i] + "", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("success");
                }
            });
            // console.log(statement);
            con_CS.query(statement, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }
    });

    app.post('/replace', function (req, res) {
        let result = Object.keys(req.body).map(function (key) {
            return [String(key), req.body[key]];
        });
        res.setHeader("Access-Control-Allow-Origin", "*");

        let name = "";
        let valueSubmit = "";

        for (let i = 0; i < result.length; i++) {
            if (i === result.length - 1) {
                name += result[i][0];
                valueSubmit += '"' + result[i][1] + '"';
            } else {
                name += result[i][0] + ", ";
                valueSubmit += '"' + result[i][1] + '"' + ", ";
            }
        }

        let newImage = {
            Layer_Uploader: "http://localhost:63342/NASACitySmart-V2/a/" + responseDataUuid,
            Layer_Uploader_name: responseDataUuid
        };
        name += ", Layer_Uploader, Layer_Uploader_name";
        valueSubmit += ", '" + newImage.Layer_Uploader + "','" + newImage.Layer_Uploader_name + "'";
        let filepathname = "http://localhost:63342/NASACitySmart-V2/a/" + responseDataUuid;
        var valuearray = valueSubmit.split(",");
        console.log(valuearray[3]);
        let statement2 = 'UPDATE CitySmart.Request_Form SET Date = ' + valuearray[0] + ', RID = ' + valuearray[1] + ', UID = ' + valuearray[2] + ', FirstLayer = ' + valuearray[3] + ', FirstOther = ' + valuearray[4] + ', SecondLayer = ' + valuearray[5] + ', SecondOther = ' + valuearray[6] + ', LayerName = ' + valuearray[7] + ', CityName = ' +valuearray[8] + ', StateName = ' + valuearray[9] +  ', CountryName = ' +valuearray[10] + ', Layer_Description = ' + valuearray[11] + ', LayerFormat = ' + valuearray[12] +  ' WHERE RID =' + valuearray[1] + ';' ;
        if(valuearray[3] === '"other"'){
            console.log("work?");
            let statement = "INSERT INTO CitySmart.LayerMenu VALUES (" + valuearray[7] + "," + valuearray[0] + "," + valuearray[4] + "," + valuearray[6] + "," + valuearray[7] + "," + valuearray[10] + "," + valuearray[8] + "," + valuearray[9] + ", 'Active');";
            con_CS.query(statement2 + statement, function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json("Connected!")
                }
            });
        }else{
            console.log("now?");
            let statement = "INSERT INTO CitySmart.LayerMenu VALUES (" + valuearray[7] + "," + valuearray[0] + "," + valuearray[3] + "," + valuearray[5] + "," + valuearray[7] + "," + valuearray[10] + "," + valuearray[8] + "," + valuearray[9] + ", 'Active');";
            con_CS.query(statement2 + statement, function (err, result) {
                if (err) {
                    throw err;
                } else {
                    res.json("Connected!")
                }
            });
        }
    });

    //
    //Put back the photo in the form
    app.get('/edit', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        let editIDSr = req.query.editIDSr;
        console.log(editIDSr);
        let myStat = "SELECT Layer_Uploader, Layer_Uploader_name FROM Request_Form WHERE RID = '" + editIDSr + "'";
        console.log(myStat);

        let filePath0;
        con_CS.query(myStat, function (err, results) {
            // console.log("query statement : " + myStat);
            if (!results[0].Layer_Uploader && !results[0].Layer_Uploader_name) {
                console.log("Error");
            } else {
                filePath0 = results[0];
                let JSONresult = JSON.stringify(results, null, "\t");
                res.send(JSONresult);
                res.end()
            }
        });
    });

    //Delete button
    app.get('/deleteData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let transactionID = req.query.transactionIDStr.split(',');
        let pictureStr = req.query.pictureStr.split(',');
        for (let i = 0; i < transactionID.length; i++) {
            let statement = "UPDATE CitySmart.Request_Form SET Status = 'Delete' WHERE RID = '" + transactionID[i] + "'";
            fs.rename("./b/" + pictureStr[i] + "" , "./a/" + pictureStr[i] + "", function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("success");
                }
            });
            con_CS.query(statement, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }


    });

    //AddData in table
    app.get('/AddData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT Request_Form.*, UserLogin.userrole FROM UserLogin INNER JOIN Request_Form ON UserLogin.username = Request_Form.UID', function (err, results) {
            if (err) throw err;
            res.json(results);
            // console.log(results);
        })
    });

    app.get('/editdata',function (req,res){
        // var d = new Date();
        // var utcDateTime = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);
        // var queryRID = "SELECT COUNT(RID) AS number FROM Special_ID WHERE RID LIKE '" + utcDateTime + "%';";
        res.render('Layer Request Form edit.ejs', {
            user: req.user
        });
    });

    // =====================================
    // GAUGE SECTION =================
    // =====================================

    // app.get('/filterUser', function (req, res) {
    app.get('/gaugeData', function (req, res) {
        let myStat = 'SELECT Hum_Out FROM WS_MT1';

        console.log(myStat);

        let myQuery = [
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
                let status = [{errStatus: ""}];

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
                    let JSONresult = JSON.stringify(result, null, "\t");
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

        let j = 0;

        for (let i = 0; i < myQuery.length; i++) {
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

    app.get('/times', function (req, res) {
        con_Wind.query('select * from WS_MT1'
        ).then(result => {
            console.log(result.length);
            res.send(result)
        }).catch(err => {
            res.status(500).send(err.stack)
        })
    });

    app.get('/newHum', function (req, res) {
        let myStat = "SELECT Hum_Out, time FROM WS_MT1 WHERE time >= '" + req.query.timeFrom + "' AND time <= '" + req.query.timeTo + "'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            let status = [{errStatus: ""}];

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
                let Hum_Out = [];

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
        let myStat = "SELECT Temp_Out, time FROM WS_MT1 WHERE time >= '" + req.query.timeFrom + "' AND time <= '" + req.query.timeTo + "'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            let status = [{errStatus: ""}];

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
                let Temp_Out = [];

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
        let myStat = "SELECT Wind_Speed, time FROM WS_MT1 WHERE time >= '" + req.query.timeFrom + "' AND time <= '" + req.query.timeTo + "'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            let status = [{errStatus: ""}];

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
                let Wind_Speed = [];

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
        let myStat = "SELECT Hum_Out, time FROM WS_MT1 WHERE time >= '2018-04-01T04:00:00.000Z' AND time <= '2018-05-30T04:00:00.000Z'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            let status = [{errStatus: ""}];

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
                let Hum_Out = [];

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
        let myStat = "SELECT Temp_Out, time FROM WS_MT1 WHERE time >= '2018-04-01T04:00:00.000Z' AND time <= '2018-05-30T04:00:00.000Z'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            let status = [{errStatus: ""}];

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
                let Temp_Out = [];

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
        let myStat = "SELECT Wind_Speed, time FROM WS_MT1 WHERE time >= '2018-04-01T04:00:00.000Z' AND time <= '2018-05-30T04:00:00.000Z'";

        console.log(myStat);

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_Wind.query(myStat, function (err, result, fields) {
            let status = [{errStatus: ""}];

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
                let Wind_Speed = [];

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

    // =====================================
    // CitySmart Menu Filter SECTION =======
    // =====================================

    app.get('/CountryList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT CountryName FROM LayerMenu GROUP BY CountryName", function (err, results) {
            if (err) throw err;
            res.json(results);
            console.log(results);
        });
    });

    app.get('/StateList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT CountryName, StateName, COUNT (*) AS count FROM LayerMenu GROUP BY CountryName, StateName', function (err, results, fields) {
            if (err) throw err;
            res.json(results);
            console.log(results);

        });
    });

    app.get('/CityList', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT StateName, FirstLayer, SecondLayer, CityName FROM LayerMenu', function (err, results) {
            res.json(results);
            console.log(results);
        });
    });

    app.get('/ChangeCityName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query('SELECT CityName, StateName, COUNT (*) AS count FROM LayerMenu GROUP BY CityName, StateName', function (err, results, fields) {
            res.json(results);
            console.log(results);
        });
    });

//Delete button
    app.get('/deleteData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        let transactionID = req.query.transactionIDStr.split(',');
        console.log(transactionID);
        for (let i = 0; i < transactionID.length; i++) {
            let statement = "UPDATE CitySmart.GeneralFormDatatable SET Status = 'Delete' WHERE ID = '" + transactionID[i] + "'";
            // console.log(statement);
            con_CS.query(statement, function (err, results) {
                if (err) throw err;
                res.json(results[i]);
            });
        }

    });

//AddData in table
    app.get('/AddData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT * FROM GeneralFormDatatable", function (err, results) {
            if (err) throw err;
            res.json(results);
        })
    });

//check if the layer name is available
    app.get('/SearchLayerName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM LayerMenu", function (err, results) {
            if (err) throw err;
            res.json(results);

        });
    });


    app.get('/EditData', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT Full Name, Address Line 1, Address Line 2, City, State/Province/Region, Postal Code/ZIP, Country, Email, Phone Number, Layer Name, Layer Category, Layer Description, Layer Uploader FROM GeneralFormDatatable", function (err, results) {
            if (err) throw err;
            console.log(results);
        })
    });

    app.get('/SearchLayerName', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        con_CS.query("SELECT ThirdLayer FROM LayerMenu", function (err, results) {
            if (err) throw err;
            // console.log(results);
            res.json(results);

        });
    });

    app.delete("/deleteFiles/:uuid", onDeleteFile);

    // =====================================
    // CitySmart Dynamic Menu SECTION ======
    // =====================================
    app.get('/firstlayer', function (req, res) {

        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT FirstLayer From LayerMenu", function (err, result) {

            console.log("recive and processing");

            let JSONresult = JSON.stringify(result, null, "\t");
            console.log(JSONresult);

            res.send(JSONresult);

            res.end();

        });
    });

    app.get('/secondlayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT SecondLayer From LayerMenu", function (err, result) {

            console.log("recive and processing");

            let JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
            res.end();

        });

    });

    app.get('/thirdlayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT ThirdLayer From LayerMenu", function (err, result) {

            console.log("recive and processing");

            let JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
            res.end();

        });

    });


    app.get('/layername', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT LayerName From LayerMenu", function (err, result) {

            console.log("recive and processing");

            let JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
        });
    });

    app.get('/createlayer', function (req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");

        con_CS.query("SELECT * From CitySmart.LayerMenu", function (err, result) {
            console.log("recive and processing");

            let JSONresult = JSON.stringify(result, null, "\t");

            res.send(JSONresult);
        });

    });

    // =====================================
    // CitySmart Graphs SECTION ============
    // =====================================

    let valueEnergy;
    let startDateTime;
    let endDateTime;

    app.get('/EnergyGraph', function (req, res) {
        valueEnergy = req.query.keywords;
        startDateTime = req.query.startDateTime;
        endDateTime = req.query.endDateTime;
        //console.log(valueEnergy);
        //console.log(startDateTime);
        //console.log(endDateTime);

        if (valueEnergy === "budget") {
            con_EnergyBudget.query('SELECT sum(Electricity_Usage) as Electricity_Usage FROM "FTAA_Energy"."autogen"."Energy_Budget" WHERE time >= 1473120000000000000 and time <= 1504652400000000000 GROUP BY time(1h)').then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                //console.log(JSONresult);

                res.send(JSONresult);
            });
        } else if (valueEnergy === "actual") {
            con_EnergyPredic.query('SELECT * FROM "FTAA_Energy"."autogen"."Actual_vs_Prediction"').then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                //console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        } else {
            let queryDate = 'SELECT Electricity_Usage, Machine_ID, Machine_Name FROM "FTAA_Energy"."autogen"."Energy_Budget" WHERE time >= ' + "'" + startDateTime + "'" + 'AND time < ' + "'" + endDateTime + "'" + " GROUP BY Machine_ID";
            //console.log(queryDate);
            con_EnergyBudget.query(queryDate).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                //console.log(JSONresult);

                res.send(JSONresult);
            });
        }

    });

    let valueWater;
    let query1 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Calcium_Ion-Selective_Electrode'";
    let query2 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Ammonium_Ion-Selective_Electrode'";
    let query3 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Potassium_ion-Selective_Electrode'";
    let query4 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Chloride_Probe'";
    let query5 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Colorimeter'";
    let query6 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Turbidity_Sensor'";
    let query7 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'PH_Sensor'";
    let query8 = 'SELECT * FROM "FTAA_Water"."autogen"."Water_Experiment" WHERE "Element" = ' + "'Temperature_Probe_(C)'";

    app.get('/WaterGraph', function (req, res) {
        valueWater = req.query.keywords;
        console.log(valueWater);
        if (valueWater === "Calcium") {
            con_Water.query(query1).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "Ammonium") {
            con_Water.query(query2).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "Potassium") {
            con_Water.query(query3).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "Chloride") {
            con_Water.query(query4).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "Colorimeter") {
            con_Water.query(query5).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "Turbidity") {
            con_Water.query(query6).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "pH") {
            con_Water.query(query7).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }

        if (valueWater === "Temperature") {
            con_Water.query(query8).then(results => {
                let origin = req.headers.origin;
                res.setHeader("Access-Control-Allow-Origin", origin);

                let JSONresult = JSON.stringify(results, null, "\t");
                console.log(JSONresult);

                res.send(JSONresult);
                res.end();
            });
        }
    });

    // =====================================
    // Others  =============================
    // =====================================
    app.get('/scanner', function (req, res) {
        res.render('scanner.ejs')
    });

    app.get('Cancel', function (req, res) {
        res.redirect('/userHome');
        res.render('userHome', {
            user: req.user // get the user out of session and pass to template
        });
    });


// Customized Functions Below
    function isLoggedIn(req, res, next) {

        // if user is authenticated in the session, carry on
        if (req.isAuthenticated())
            return next();

        // if they aren't redirect them to the home page
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
        date3 = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + (today.getDate() + 1);
        time3 = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        tokenExpire = date3 + ' ' + time3;
    }

    function del_recov(StatusUpd, ErrMsg, targetURL, req, res) {

        transactionID = req.query.transactionIDStr.split(",");
        console.log(transactionID);
        let statementGeneral = "UPDATE Request_Form SET Status = '" + StatusUpd + "'";
        // let statementDetailedS = "UPDATE Detailed_Scouting SET Status = '" + StatusUpd + "'";
        // let statementDetailedT = "UPDATE Detailed_Trap SET Status = '" + StatusUpd + "'";

        for (let i = 0; i < transactionID.length; i++) {
            if (i === 0) {
                statementGeneral += " WHERE RID = '" + transactionID[i] + "'";
                // statementDetailedS += " WHERE transactionID = '" + transactionID[i] + "'";
                // statementDetailedT += " WHERE transactionID = '" + transactionID[i] + "'";

                if (i === transactionID.length - 1) {
                    statementGeneral += ";";
                    // statementDetailedS += ";";
                    // statementDetailedT += ";";
                    myStat = statementGeneral;
                    updateDBNres(myStat, "", ErrMsg, targetURL, res);
                }
            } else {
                statementGeneral += " OR RID = '" + transactionID[i] + "'";
                // statementDetailedS += " OR transactionID = '" + transactionID[i] + "'";
                // statementDetailedT += " OR transactionID = '" + transactionID[i] + "'";

                if (i === transactionID.length - 1) {
                    statementGeneral += ";";
                    // statementDetailedS += ";";
                    // statementDetailedT += ";";
                    myStat = statementGeneral;
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
            } else {
                res.json({"error": false, "message": targetURL});
            }
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

function QueryStat(myObj, scoutingStat, res) {
    // console.log(myObj);
    let j = 0;
    for (let i = 0; i < myObj.length; i++) {
        //console.log("i = " + i);
        // console.log(!!myObj[i].fieldVal);

        if (!!myObj[i].adj){
            // console.log(i  + "   " + myObj[i].adj);
            // if (i === 3 || i === 4 || i === 5) {
            //     myObj[i].dbCol = myObj[i].dbCol.substring(1, myObj[i].dbCol.length);
            //     myObj[i].table = parseInt(myObj[i].table.substring(0, 1));
            // }

                let aw;
                if (j === 0) {
                    aw = " WHERE ";
                    j = 1;
                } else {
                    aw = " AND ";
                }

                // if (myObj[i].table === 1) {
                //     scoutingStat = editStat(scoutingStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
                //     console.log(scoutingStat);
                //     // trapStat = editStat(trapStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
                // } else if (myObj[i].table === 2) {
                //     scoutingStat = editStat(scoutingStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);
                // }

                scoutingStat = editStat(scoutingStat, aw, myObj[i].dbCol, myObj[i].op, myObj[i].fieldVal);

                if (i === myObj.length - 1) {
                    let sqlStatement = scoutingStat + "; ";
                    dataList(sqlStatement, res);
                }
            } else {
                if (i === myObj.length - 1) {
                    let sqlStatement = scoutingStat + "; ";
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
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        // console.log(sqlStatement);
        con_CS.query(sqlStatement, function (err, results, fields) {

            errStatus = [{errMsg: ""}];

            if (err) {
                console.log(err);
                errStatus[0].errMsg = "fail";
                res.send(errStatus);
                res.end();
            } else if (results.length === 0) {
                errStatus[0].errMsg = "no data entry";
                res.send(errStatus);
                res.end();
            } else {
                // console.log(results);
                // let result = results;
                let JSONresult = JSON.stringify(results, null, "\t");
                // console.log(JSONresult);
                res.send(JSONresult);
                res.end();
            }
        });
    }

    function changeMail(str) {
        let spliti = str.split("@");
        let letter1 = spliti[0].substring(0, 1);
        let letter2 = spliti[0].substring(spliti[0].length - 1, spliti[0].length);
        let newFirst = letter1;
        for (i = 0; i < spliti[0].length - 2; i++) {
            newFirst += "*";
        }
        newFirst += letter2;

        let letter3 = spliti[1].substring(0, 1);
        let extension = letter3;
        for (i = 0; i < spliti[1].split(".")[0].length - 1; i++) {
            extension += "*";
        }
        extension += "." + spliti[1].split(".")[1];
        let result = newFirst + "@" + extension;

        return result;
    }

    function onUpload(req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        console.log(req.headers.origin);

        let form = new multiparty.Form();

        form.parse(req, function (err, fields, files) {
            console.log(fields);
            console.log("A");
            let partIndex = fields.qqpartindex;

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

    let responseDataUuid = "",
        responseDataName = "",
        responseDataUuid2 = "",
        responseDataName2 = "";

    function onSimpleUpload(fields, file, res) {
        res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross domain header
        responseDataUuid = "";

        let d = new Date(),
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
            moveUploadedFile(file, uuid, function () {
                    responseData.success = true;
                    res.send(responseData);
                },
                function () {
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
        let size = parseInt(fields.qqtotalfilesize),
            uuid = fields.qquuid,
            index = fields.qqpartindex,
            totalParts = parseInt(fields.qqtotalparts),
            responseData = {
                success: false
            };

        file.name = fields.qqfilename;

        if (isValid(size)) {
            storeChunk(file, uuid, index, totalParts, function () {
                    if (index < totalParts - 1) {
                        responseData.success = true;
                        res.send(responseData);
                    }
                    else {
                        combineChunks(file, uuid, function () {
                                responseData.success = true;
                                res.send(responseData);
                            },
                            function () {
                                responseData.error = "Problem conbining the chunks!";
                                res.send(responseData);
                            });
                    }
                },
                function (reset) {
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

    let uuid = req.params.uuid,
        dirToDelete = "a/" + uuid;
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
        mkdirp(destinationDir, function (error) {
            let sourceStream, destStream;

            if (error) {
                console.error("Problem creating directory " + destinationDir + ": " + error);
                failure();
            }
            else {
                sourceStream = fs.createReadStream(sourceFile);
                destStream = fs.createWriteStream(destinationFile);

                sourceStream
                    .on("error", function (error) {
                        console.error("Problem copying file: " + error.stack);
                        destStream.end();
                        failure();
                    })
                    .on("end", function () {
                        destStream.end();
                        success();
                    })
                    .pipe(destStream);
            }
        });
    }

function moveUploadedFile(file, uuid, success, failure) {
    console.log("this is: " + uuid);
    // let destinationDir = uploadedFilesPath + uuid + "/",
    let destinationDir = "a/",
        fileDestination = destinationDir + uuid + "_" + file.name;

        moveFile(destinationDir, file.path, fileDestination, success, failure);
    }

    function storeChunk(file, uuid, index, numChunks, success, failure) {
        let destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
            chunkFilename = getChunkFilename(index, numChunks),
            fileDestination = destinationDir + chunkFilename;

        moveFile(destinationDir, file.path, fileDestination, success, failure);
    }

    function combineChunks(file, uuid, success, failure) {
        let chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
            destinationDir = uploadedFilesPath + uuid + "/",
            fileDestination = destinationDir + file.name;


        fs.readdir(chunksDir, function (err, fileNames) {
            let destFileStream;

            if (err) {
                console.error("Problem listing chunks! " + err);
                failure();
            }
            else {
                fileNames.sort();
                destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

                appendToStream(destFileStream, chunksDir, fileNames, 0, function () {
                        rimraf(chunksDir, function (rimrafError) {
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
                .on("end", function () {
                    appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
                })
                .on("error", function (error) {
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
        let digits = new String(count).length,
            zeros = new Array(digits + 1).join("0");

        return (zeros + index).slice(-digits);
    }
}

function sendToken(username, subject, text, url, res) {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                token = buf.toString('hex');
                tokenExpTime();
                done(err, token, tokenExpire);
            });
        },
        function (token, tokenExpire, done) {
            // connection.query( "INSERT INTO Users ( resetPasswordExpires, resetPasswordToken ) VALUES (?,?) WHERE username = '" + req.body,username + "'; ")
            myStat = "UPDATE UserLogin SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE username = '" + username + "' ";
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
                to: username, // Comma separated list of recipients
                subject: subject, // Subject of the message

                // plaintext body
                text: 'You are receiving this because you (or someone else) have requested ' + text + '\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                url + token + '\n\n' +
                'If you did not request this, please ignore this email.\n'
            };

            smtpTrans.sendMail(message, function(error){
                if(error){
                    console.log(error.message);
                    res.json({"error": true, "message": "An unexpected error occurred !"});
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

function successMail(username, subject, text, res) {
    var message = {
        from: 'FTAA <aaaa.zhao@g.feitianacademy.org>',
        to: username,
        subject: subject,
        text: text
    };

    smtpTrans.sendMail(message, function (error) {
        if(error){
            console.log(error.message);
        } else {
            res.render('success.ejs', {});
        }
    });
}