const fs = require('fs')
const path = require('path')

// module.exports = {
//     ConnectionControl
//     // loadSetting,
//     // hasRobotName,
//     // findRobotNameFromPid,
//     // addSetting,
//     // updateSetting,
//     // getConList
// }

//---------该模块在转储节点运行时，维护转储节点配置文件和转储节点运行时状态表的一致性-------------

module.exports = ConnectionControl

function ConnectionControl(){
    //转储结点状态表
    var connectionList = []
    //设备名表
    var robotNames = []

    this.getLength = function(){
        return connectionList.length
    }

    //获取所有状态表数据
    this.getConnectionList = function(){
        return connectionList;
    }

    this.getItem = function(index){
        //范围检测
        if(index < connectionList.length){
            return connectionList[index]
        }
    }

    this.getItemByRobotName = function(_robot_name){
        for(let i in connectionList){
            //console.log('[平台控制]test：'+_robot_name)
            //console.log('[平台控制]test：'+connectionList[i].robot_name)
            if(_robot_name === connectionList[i].robot_name){
                return connectionList[i]
            }
        }
        return null
    }

    this.getCopiedItemByRobotName = function(_robot_name){
        for(let i in connectionList){
            //console.log('[平台控制]test：'+_robot_name)
            //console.log('[平台控制]test：'+connectionList[i].robot_name)
            if(_robot_name === connectionList[i].robot_name){
                const connection = {
                    "robot_name": connectionList[i].robot_name,
                    "resource_ip":connectionList[i].resource_ip,
                    "frp_port":connectionList[i].frp_port,
                    "switch":connectionList[i].switch,
                    "del_flag":connectionList[i].del_flag,
                    "pid":connectionList[i].pid,
                    "state":connectionList[i].state,
                    "handle":null
                }
                return connection
            }
        }
        return null
    }

    //根据转储节点状态表序号找到某行设备内容，并绑定进程信息
    this.setHandleByIndex = function(index,child){
        connectionList[index].handle = child
        //console.log('setHandleByIndex测试1：'+child.pid)
        //console.log('setHandleByIndex测试2：'+connectionList[index].handle.pid)
    }

    //根据设备名，在转储节点状态表中找到某行设备内容，并绑定进程信息
    this.setHandleByRobotName = function(_robot_name,child){
        for(let i in connectionList){
            if(_robot_name === connectionList[i].robot_name){
                connectionList[i].handle = child   
            }
        }
    }

    this.getHandleByRobotName = function(_robot_name){
        for(let i in connectionList){
            if(_robot_name === connectionList[i].robot_name){
                return connectionList[i].handle   
            }
        }
        return null
    }

    //当前所有设备名
    this.getAllRobotName = function(){
        //先清空
        robotNames = []
        for(let i in connectionList){
            robotNames.push(connectionList[i].robot_name)
        }
    }

    //判断当前robot_name在转储节点状态表中是否存在，不存在返回fasle
    this.hasRobotName = function(_robot_name){
        for(let i in robotNames){
            if(_robot_name === robotNames[i])
                return true
        }
        return false
    }

    //根据pid查找robot_name
    this.findRobotNameByPid = function(_pid){
        for(let i in connectionList){
            if(_pid === connectionList[i].pid){
                return connectionList[i].robot_name   
            }
        }
        return null
    }
    //根据序号，设置元素的pid
    this.setPidByIndex = function(index, _pid){
        connectionList[index].pid = _pid
    }

    //根据旧pid找到表中元素，并修改成新的pid
    this.getIndexByPid = function(_pid){
        for(let i in connectionList){
            if(_pid === connectionList[i].pid){
                return i
            }
        }
        return -1;
    }

    this.getIndexByRobotName = function(_robot_name){
        for(let i in connectionList){
            if(_robot_name === connectionList[i].robot_name){
                return i
            }
        }
        return -1;
    }

    this.getSwitchByIndex = function(index){
        return connectionList[index].switch
    }

    this.setStateByIndex = function(index, _state){
        connectionList[index].state = _state
    }


    //转储节点配置载入
    this.loadSetting = function(){
        const connectionSettingStr = fs.readFileSync(path.join(__dirname,'../config/connection.json'))
        var connectionSetting = JSON.parse(connectionSettingStr)
        connectionList = connectionSetting.robot_settings
        //var robot_settings = config.get('robot_settings')
        console.log('设备状态表已载入，长度为：'+connectionList.length)
        //更新设备名表
        this.getAllRobotName()
        console.log('设备名表已载入：'+robotNames)
    }

    //转储设置:新增连接设置
    this.addSetting = function(_robot_name,_resource_ip,_frp_port,_switch){
        //当前设备名不存在,允许新增设置
        if(!this.hasRobotName(_robot_name)){
            const new_connection = {
                "robot_name": _robot_name,
                "resource_ip":_resource_ip,
                "frp_port":_frp_port,
                "switch":_switch,
                "del_flag":0,
                "pid":null,
                "state":0,
                "handle":null
            }
            //更新转储结点状态表
            connectionList.push(new_connection)
            //更新设备名表
            this.getAllRobotName()

            console.log('新增连接设置：'+new_connection.robot_name+'|'+new_connection.resource_ip+'|'+new_connection.frp_port)

            //将运行时的状态信息清除
            var connectionListTemp = []
            for(let j in connectionList){
                const new_connection = {
                    "robot_name": connectionList[j].robot_name,
                    "resource_ip":connectionList[j].resource_ip,
                    "frp_port":connectionList[j].frp_port,
                    "switch":connectionList[j].switch,
                    "del_flag":connectionList[j].del_flag,
                    "pid":null,
                    "state":0,
                    "handle":null
                }
                connectionListTemp.push(new_connection)
            }
            //转储节点配置文件操作,异步
            const connectionSettingStrUpd = '{ "robot_settings":'+JSON.stringify(connectionListTemp,null,2)+"}"
            fs.writeFile(path.join(__dirname,'../config/connection.json'), connectionSettingStrUpd, function(err){
                if (err) {
                    return console.error(err);
                }
                console.log("转储节点配置文件已更新！")
            })   

            return true
        }else{
            console.log("新增设备名冲突: refuse!");
            return false
        }
    }

    //转储设置：按robot_name修改连接设置
    this.updateSetting = function(_robot_name,_resource_ip,_frp_port,_switch,_del_flag){
        //在简表中查询待修改的设备名是否存在
        if(this.hasRobotName(_robot_name)){
            //找到转储节点状态表中的对应行，并进行修改
            for(let i in connectionList){
                if(_robot_name === connectionList[i].robot_name){
                    //参数更改，不提供pid的更改
                    connectionList[i].resource_ip = _resource_ip
                    connectionList[i].frp_port = _frp_port
                    connectionList[i].switch = _switch
                    connectionList[i].del_flag = _del_flag
                    
                    console.log('更新连接设置：'+_robot_name+'|'+_resource_ip+'|'+_frp_port+'|switch:'+_switch+'|del_flag:'+_del_flag)

                    //将运行时的状态信息清除
                    var connectionListTemp = []
                    for(let j in connectionList){
                        const new_connection = {
                            "robot_name": connectionList[j].robot_name,
                            "resource_ip":connectionList[j].resource_ip,
                            "frp_port":connectionList[j].frp_port,
                            "switch":connectionList[j].switch,
                            "del_flag":connectionList[j].del_flag,
                            "pid":null,
                            "state":0,
                            "handle":null
                        }
                        connectionListTemp.push(new_connection)
                    }
                    const connectionSettingStrUpd = '{ "robot_settings":'+JSON.stringify(connectionListTemp,null,2)+"}"
                    //转储节点配置文件操作,异步
                    fs.writeFile(path.join(__dirname,'../config/connection.json'), connectionSettingStrUpd, function(err){
                    if (err) {
                        return console.error(err);
                    }
                    console.log("转储节点配置文件已更新！")
                    })

                    return true

                }
            }

        }
        return false
        
    }

}



//测试程序
// loadSetting()

// if(hasRobotName('wheeltec_zed2i_1')){
//     console.log('当前robot_name在转储节点状态表中已存在')
// }else{
//     console.log('当前robot_name在转储节点状态表中不存在')
// }

// if(findRobotNameFromPid(43221) === null){
//     console.log('当前pid在转储节点状态表中不存在')
// }else{
//     console.log('当前pid:'+43221+'在转储节点状态表中对应的robot_name为:'+ findRobotNameFromPid(43221))
// }

// addSetting('wheeltec_zed2i_5','127.0.0.1',9090,1)

// updateSetting('wheeltec_zed2i_5','127.0.0.1',9099,1,0)
