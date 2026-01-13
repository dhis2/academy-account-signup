//noinspection Eslint
(function(){
    'use strict';
    
    var conf = require('../conf/configuration.json');

    module.exports.getConfig = getConfig;

    function getConfig(url) {
        
        for (var i = 0; i < conf.inviteConfigs.length; i++) {
            if (conf.inviteConfigs[i].server.url == url) return conf.inviteConfigs[i];
        }

        return false;
    }


}());