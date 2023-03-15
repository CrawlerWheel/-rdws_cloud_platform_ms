const express = require('express')
const mysql = require('mysql')
const path = require('path')
const child_process = require('child_process')
const ConnectionControl = require('./src/connectionControl')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

//载入配置文件至转储状态表
connectionControl = new ConnectionControl()
connectionControl.loadSetting()  

//传入目标连接设置在状态表中的序号，以创建转储进程
function createChild (i) {

    //参数
    const robotNameFromStateTable = connectionControl.getItem(i).robot_name 
    const resourceIpFromStateTable = connectionControl.getItem(i).resource_ip
    const portFromStateTable = connectionControl.getItem(i).frp_port
    const params = [robotNameFromStateTable,resourceIpFromStateTable,portFromStateTable]

    //进程创建
    const child = child_process.fork('./src/rosTransport.js',params,{
        silent: false
    });
    connectionControl.setPidByIndex(i,child.pid)
    connectionControl.setHandleByIndex(i,child)

    console.log('[转储中心-中途事件] 成功创建子进程：'+child.pid)

    //事件处理
    child.on('message', function(msg){
        //事件处理用于更新连接状态
        const target = connectionControl.getIndexByPid(child.pid)
        connectionControl.setStateByIndex(target,msg.state)
        console.log(`[转储中心-中途事件] 进程（pid：${child.pid}) 的连接状态已更新：${msg.state}`)
    })

    child.on('exit', () => {
        console.log(`[转储中心-中途事件] 进程（pid：${child.pid}) is exiting...`)
        const target = connectionControl.getIndexByPid(child.pid)
        //connectionControl.setHandleByIndex(target,null)//将handle置空
        //判别当前开关状态
        if(connectionControl.getSwitchByIndex(target) === 1){
            //重启转储进程
            console.log(`[转储中心-中途事件] 进程（pid：${child.pid}) setuping again...`)
            createChild(target)	
        }
    })
}

//-----------根据转储状态表启动转储服务-------------
for(var i = 0; i < connectionControl.getLength(); i++){
    //对开关打开的设备启动转储服务
    if(connectionControl.getItem(i).switch === 1){
        createChild(i)
    }
}

app.listen(13389,()=>{
    console.log('server is access')
})

//-----------转储节点web服务-------------

/**
 * @api {post} /addSetting Post add info
 * @apiDescription 云平台对转储节点添加一行设置
 * @apiGroup Control
 * @apiSampleRequest http://localhost/addSetting/
 * @apiVersion 1.0.0
 * @apiBody {String} robot_name        当前请求变更设置的机器人设备名.
 * @apiBody {String} resource_ip       转储对象的代理服务所在ip.
 * @apiBody {Number} frp_port          转储对象代理服务的监听端口.
 * @apiBody {Number} switch            转储功能开关，1表示开启，0表示关闭.
 * @apiSuccess {String}   result    返回一段字符串.
 * @apiSuccessExample {json} Success-Response:
 *                    { "result": "success" }
 */
app.post('/addSetting',function(req,res){
    const result = connectionControl.addSetting(req.body.robot_name,req.body.resource_ip,req.body.frp_port,req.body.switch)
    //如果成功添加
    //console.log('/addSetting 测试：'+result)
    if(result){
        if(req.body.switch === 1){
            //开启新增的转储服务
            const target = connectionControl.getIndexByRobotName(req.body.robot_name)
            createChild(target)
        }
        res.send({
            "result":'success'
        })
    }else{
        res.send({
            "result":'Naming conflict'
        })
    }
    
})

/**
 * @api {post} /modifySetting Post modify info
 * @apiDescription 云平台对转储节点单行设置的控制
 * @apiGroup Control
 * @apiSampleRequest http://localhost/modifySetting/
 * @apiVersion 1.0.0
 * @apiBody {String} robot_name        当前请求变更设置的机器人设备名.
 * @apiBody {String} resource_ip       转储对象的代理服务所在ip.
 * @apiBody {Number} frp_port          转储对象代理服务的监听端口.
 * @apiBody {Number} switch            转储功能开关，1表示开启，0表示关闭.
 * @apiBody {Number} del_flag          连接设置删除标记.
 * @apiSuccess {String}   result    返回一段字符串.
 * @apiSuccessExample {json} Success-Response:
 *                    { "result": "success" }
 */

app.post('/modifySetting',function(req,res){
    const item_old = connectionControl.getCopiedItemByRobotName(req.body.robot_name)
    const target = connectionControl.getIndexByRobotName(req.body.robot_name)
    //如果获取到对应设备名的数据行
    if(item_old){
        //优先完成配置的更新
        connectionControl.updateSetting(req.body.robot_name,req.body.resource_ip,req.body.frp_port,req.body.switch,req.body.del_flag)

        //------------检测更新的状态，并进行对应操作-------------

        //更改 ip port 删除标记 三种属性时，
        if(req.body.resource_ip != item_old.resource_ip || req.body.frp_port != item_old.frp_port || req.body.del_flag === 1){
            //若开关为开,对转储进程进行重启（del_flag对应的则恰好是永久关停的操作）
            if(item_old.switch === 1 ){

                //退出当前转储服务
                connectionControl.setStateByIndex(target,0)//强制退出时主程序主动将state置0
                connectionControl.getHandleByRobotName(req.body.robot_name).kill()

                //再次尝试退出当前转储服务，防止存在正在初始化的子进程逃逸
                setTimeout(function () {
                    connectionControl.setStateByIndex(target,0)//强制退出时主程序主动将state置0
                    connectionControl.getHandleByRobotName(req.body.robot_name).kill()
                    console.log("killed again"); 
                }, 1000); 

                //后续由createChild中exit事件的逻辑负责新子进程的创建...
            }
        }
        if(req.body.switch != item_old.switch){
            //如果原始设备数据转储服务为开启状态，对节点进行关闭
            if(item_old.switch === 1){
                console.log(`主进程已终止 ${req.body.robot_name} 的转储服务`)
                //退出当前转储服务
                connectionControl.setStateByIndex(target,0)//强制退出时主程序主动将state置0
                connectionControl.getHandleByRobotName(req.body.robot_name).kill()

                //再次尝试退出当前转储服务，防止存在正在初始化的子进程逃逸
                setTimeout(function () {
                    connectionControl.setStateByIndex(target,0)//强制退出时主程序主动将state置0
                    connectionControl.getHandleByRobotName(req.body.robot_name).kill()
                    console.log("killed again"); 
                }, 1000); 

                //后续由createChild中exit事件的逻辑负责后续工作...
            }

            //如果当前设备数据转储服务为关闭状态，对节点进行开启，另外开启不代表真的接通，具体连接状态要看state
            if(item_old.switch === 0){
                createChild(target)
            }

        }
        res.send({
            "result":'success'
        })
    }else{
        res.send({
            "result":'robot_name is not exist!'
        })
    }

})

/**
 * @api {get} /getAllState Get connnecttion state info
 * @apiDescription 获取所有设置的连接状态
 * @apiGroup Control
 * @apiSampleRequest http://localhost/getAllState/
 * @apiVersion 1.0.0
 * @apiSuccess {Object[]} connect_states     连接状态数组.
 * @apiSuccess {Number}   connect_state.robot_name   设备名.
 * @apiSuccess {String}   connect_state.state       设备当前连接状态（不是指开关状态）.
 * @apiSuccessExample {json} Success-Response:
 * [
 *   {
 *       "robot_name": "wheeltec_zed2i_1",
 *       "state": 0
 *   },
 *   {
 *       "robot_name": "wheeltec_zed2i_2",
 *       "state": 0
 *   },
 *   {
 *       "robot_name": "wheeltec_zed2i_3",
 *       "state": 0
 *   }
 * ]
 * 
 */

app.get('/getAllState',function(req,res){
    const connect_states = []
    const array_connection = connectionControl.getConnectionList()
    for(var i = 0, len = array_connection.length; i < len; i++) {
        const state_item = {
            "robot_name":array_connection[i].robot_name,
            "state":array_connection[i].state
        }
        connect_states.push(state_item)
    }
    res.send(connect_states)
})

app.get('/getAllSetting',function(req,res){
    const connect_states = []
    const array_connection = connectionControl.getConnectionList()
    for(var i = 0, len = array_connection.length; i < len; i++) {
        const state_item = {
            "robot_name":array_connection[i].robot_name,
            "resource_ip":array_connection[i].resource_ip,
            "frp_port": array_connection[i].frp_port,
            "switch": array_connection[i].switch,
            "del_flag":array_connection[i].del_flag
        }
        connect_states.push(state_item)
    }
    res.send(connect_states)
})