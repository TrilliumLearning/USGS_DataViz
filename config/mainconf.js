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

    'Session_db': 'USGS',
    'Login_db': 'USGS',
    'Login_table': 'UserLogin',
    'Upload_db': 'USGS',

    'Server_Port': 9085,

    'Upload_Path': 'http://usgs.aworldbridgelabs.com/uploadfiles',
    // 'Upload_Dir': '/var/www/usgs/uploadfiles',
    'Upload_Dir': '/var/www/usgs/uploadfiles',

    // 'GeoData_Dir': '/usr/share/worldwind-geoserver-0.2.1/data_dir/data/USGS'
    'GeoData_Dir': '/usr/share/worldwind-geoserver-0.2.1/data_dir/data/USGS'

};
