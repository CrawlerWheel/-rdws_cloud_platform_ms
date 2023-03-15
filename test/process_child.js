var cluster = require('cluster');
var os = require('os');
const fs = require('fs');
const ROSLIB = require('roslib')
const path = require('path')
const { stringify } = require('querystring');
const ConnectionControl = require('../src/connectionControl')
const child_process = require('child_process')

connectionControl = new ConnectionControl()

connectionControl.loadSetting()   

for(var i = 0; i < connectionControl.getLength(); i++){
    const robotNameFromStateTable = connectionControl.getItem(i).robot_name 
    const resourceIpFromStateTable = connectionControl.getItem(i).resource_ip
    const portFromStateTable = connectionControl.getItem(i).frp_port
    const params = [robotNameFromStateTable,resourceIpFromStateTable,portFromStateTable]
    const child = child_process.fork('./src/rosTransport.js',params,{
        silent: false
    });
    connectionControl.setHandleByIndex(i,child)
    child.on('message', function(msg){
        console.log('parent get message: ' + JSON.stringify(msg));
    });

    // child.on('exit', (code,signal) => {
    //     console.log('child process exited with' + `code ${code} and signal ${signal}`);
    // });
    
    // child.stdout.setEncoding('utf8');
    // child.stdout.on('data', function(data){
    //     console.log('[子进程'+child.pid+']:'+data);
    // });

    console.log('成功创建子进程：'+child.pid)
}

for(var i = 0; i < connectionControl.getLength(); i++){
    connectionControl.getItem(i).handle.send({
        'action': 1 //action = 1 表示要求子进程终止
    })
    console.log("perant messaging!")
}
//console.log(connectionControl.getConnectionList())

// cluster.on('exit', function(worker, code, signal) {
//     console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
//     console.log('Starting a new worker');
//     cluster.fork();
// });

//cluster
// var numWorkers = 2
// loadSetting()
// console.log('Master cluster setting up ' + numWorkers + ' workers...');
// for(var i = 0; i < numWorkers; i++) {
//     cluster.fork();
// }
// cluster.on('online', function(worker) {
//     console.log('Worker ' + worker.process.pid + ' is online');
// });
// cluster.on('exit', function(worker, code, signal) {
//     console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
//     console.log('Starting a new worker');
//     cluster.fork();
// });


