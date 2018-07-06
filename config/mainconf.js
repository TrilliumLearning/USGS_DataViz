// config/database.js
module.exports = {
    'commondb_connection': {
        'multipleStatements': true,
        'connectionLimit' : 100,
        'host': '10.11.90.15',
        'user': 'AppUser',
        'password': 'Special888%',
        'port'    :  3306
    },
    'session_connection': {
        'multipleStatements': true,
        'connectionLimit' : 100,
        'host': '10.11.90.15',
        'user': 'AppUser',
        'password': 'Special888%',
        'port'    :  3306
    },

    'Session_db': 'CitySmart',
    'Login_db': 'CitySmart',
    'Login_table': 'UserLogin',
    'Upload_db': 'CitySmart',

    'Server_Port': 9086,

    'Upload_Path': 'http://v2.cs.aworldbridgelabs.com/uploadfiles'

};
