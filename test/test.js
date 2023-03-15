const ConnectionControl = require('../src/connectionControl')
const child_process = require('child_process')
const express = require('express')
// module.exports = {
//     //对象展开运算符
//     ...ConnectionControl,
// } 


//*****************************************
//*** 老版的connectionControl测试******
//*****************************************
// connectionControl.loadSetting()       

// connectionControl.addSetting('wheeltec_zed2i_6','127.0.0.1',9090,1)

// //console.log(connectionControl.getConList())
// console.log(connectionControl.connectionList[0])

// const connectionControl  = new ConnectionControl()

//*****************************************
//*** 面向对象版的connectionControl测试******
//*****************************************
// connectionControl = new ConnectionControl()
// connectionControl.loadSetting()
// console.log(connectionControl.findRobotNameFromPid(11111)) 
// console.log(connectionControl.connectionList)
// if(connectionControl.hasRobotName('wheeltec_zed2i_1')){
//     console.log('当前robot_name在转储节点状态表中已存在')
// }else{
//     console.log('当前robot_name在转储节点状态表中不存在')
// }

// if(connectionControl.findRobotNameFromPid(43221) === null){
//     console.log('当前pid在转储节点状态表中不存在')
// }else{
//     console.log('当前pid:'+43221+'在转储节点状态表中对应的robot_name为:'+ findRobotNameFromPid(43221))
// }

// connectionControl.addSetting('wheeltec_zed2i_8','127.0.0.1',9090,1)

// connectionControl.updateSetting('wheeltec_zed2i_7','127.0.0.1',9099,1,0)

// connectionControl.addSetting('wheeltec_zed2i_5','127.0.0.1',9090,1)

//*****************************************
//*** child process 测试******
//*****************************************
const app = express()

app.listen(80,()=>{
    console.log('server is access')
})

const params = ['wheel','192.168.0.40',9090]

const childs = []

function createChild(){

    const child1 = child_process.fork('../src/rosTransport.js',params,{
        silent: false
    });
    // const child2 = child_process.fork('../src/rosTransport.js',params,{
    //     silent: false
    // });
    // const child3 = child_process.fork('../src/rosTransport.js',params,{
    //     silent: false
    // });
    console.log(child1.pid)
    
    child1.on('message', function(msg){
        console.log('parent get message: ' + JSON.stringify(msg));
    });
    child1.on('exit', (code,signal) => {
        console.log('child process exited with' + `code ${code} and signal ${signal}`);
    });

    childs.push(child1)
}

createChild()

console.log('sheshi:'+childs[0].pid)

app.get('/pid',function(req,res){
    setTimeout(function () {
        child1.kill()
        console.log("timeout completed"); 
    }, 5000); 
    res.send({
       "child1" : child1.pid
    })   
})

// child1.stdout.setEncoding('utf8');
// child1.stdout.on('data111', function(data){
//     console.log(data);
// });
// child2.stdout.setEncoding('utf8');
// child2.stdout.on('data112', function(data){
//     console.log(data);
// });