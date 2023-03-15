const ROSLIB = require('roslib')
const mysql = require('mysql')
const path = require('path')
const fs = require('fs')
const { stringify } = require('querystring')

//------------数据库配置--------------
const db = mysql.createPool({
  host: 'XXX.XXX.XXX.XXX',
  port: '13306',
  database: 'robot_latform',
  user: 'XXXXXXXXX',
  password: 'XXXXXXXXXXXXXXX'
})

function getTimeInfo(nTimeStamps) {
  //转毫秒
  const date = new Date(nTimeStamps.secs * 1000);
  //返回转换后的时间，用于给文件命名
  const retData =  date.getFullYear()+'-'+(date.getMonth() + 1)+'-'
                  +date.getDate()+'-'+date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()+'-'+nTimeStamps.nsecs
  return retData;
}

function getTimePart(nTimeStamps){
  const date = new Date(nTimeStamps.secs * 1000);
  return date.getFullYear()+'-'+(date.getMonth() + 1)+'-'+date.getDate()+'-'+date.getHours()
}

//主程序

var robotNameStr = ''
const root_dir = `/home/comrobotbt/detect`
const root_dir_sql = `/detect`
const image_file_dir = '.image_file'
var connect_signal = false
//从转储节点状态表中获取的，当前子进程所服务的设备名（robotName），并在稍后与成功连接后返回的设备名进行验证
const robotNameFromStateTable = process.argv[2] 
//const robotNameFromStateTable = 'wheeltec-zed2i-1'
const resourceIpFromStateTable = process.argv[3]
const portFromStateTable = process.argv[4]

console.log('[subprocess'+process.pid+']:'+ robotNameFromStateTable+'||'+resourceIpFromStateTable+'||'+portFromStateTable)

//主进程消息控制
// process.on('message', (msg) => {
//   console.log('[subprocess'+process.pid+']:'+'message from parent and subprocess killed:', msg);
//   process.send({
//     'pid': process.pid,
//     'action':0 //action = 0 表示子进程终止 
//   });
//   process.exit()
// });


//创建图像库文件夹文件
if(!fs.existsSync(path.join(root_dir,image_file_dir))){
  fs.mkdir(path.join(root_dir,image_file_dir), (err) => {
    if(err){
      console.log(err)
    }else{
      console.log('已创建根文件夹：.images_file/')
    }
  })
}

// Connecting to ROS
// -----------------
var ros = new ROSLIB.Ros({
  url : `ws://${resourceIpFromStateTable}:${portFromStateTable}`
  //url : 'ws://192.168.0.40:9090'
})

// If there is an error on the backend, an 'error' emit will be emitted.
ros.on('error', function(error) {
  console.log(`error :${process.pid}进程即将关闭`);
  //console.log(error)
})

// Find out exactly when we made a connection.
ros.on('connection', function() {
  connect_signal = true
  process.send({
    'state': 1 //标识已连接状态
  });
  console.log('Connection made!');
})

//设备连接后如果意外中断，会进入这个事件后自动结束进程
ros.on('close', function() {
  if(connect_signal){
    //如果成功连接过，则需要更新状态
    process.send({
      'state': 0 //标识未连接状态
    });
  }
  console.log('Connection closed.');
  process.exit()
})

// Create a connection to the rosbridge WebSocket server.
ros.connect(`ws://${resourceIpFromStateTable}:${portFromStateTable}`);



//获取参数：当前设备名
var robotName = new ROSLIB.Param({
  ros : ros,
  name : 'robot_name'
})

robotName.get(function(value) {
  console.log('getted robot name : ' + value)
  robotNameStr = value
  //身份核验
  if(robotNameFromStateTable === robotNameStr){
      //当前机器人的视频文件夹不存在，则创建文件夹
      if(!fs.existsSync(path.join(root_dir,image_file_dir+'/'+robotNameStr+'/'))){
        fs.mkdir(path.join(root_dir,image_file_dir+'/'+robotNameStr+'/'), (err) => {
          if(err)  
            console.log(err)
          else{
            console.log('已创建视频文件夹：'+robotNameStr)
          }
        })
      }
  }else{
    //设备身份不匹配，终止进程
    console.log('设备身份不匹配，终止进程')
    // console.log(`传来的robotname${robotNameFromStateTable}`)
    // console.log(`连接的robotname${robotNameStr}`)
    process.exit()
  }

})

var listener = new ROSLIB.Topic({
  ros : ros,
  name : '/detect/Image/compressed',
  messageType : 'sensor_msgs/CompressedImage'
})

listener.subscribe(function(message) {
  const imageTimeInfo = getTimeInfo(message.header.stamp)
  const imageTimePart = getTimePart(message.header.stamp)
  var dataBuffer = new Buffer.from(message.data, 'base64'); // 解码图片 下次调试可以试试utf8
  //var dataBuffer = Buffer.from(base64Data, 'base64'); // 这是另一种写法
  fs.writeFile(path.join(root_dir,image_file_dir+'/'+robotNameStr+'/'+imageTimePart+'/'+imageTimeInfo+'.png'), dataBuffer, function(err) {
      if(err){
          //创建新时间块的图片文件夹
          fs.mkdir(path.join(root_dir,image_file_dir+'/'+robotNameStr+'/'+imageTimePart), (err) => {
              if(err) {
                console.log(err)
              }else{
                console.log('已创建新时间块的图片包：'+imageTimePart)

                //重新存储报告异常的图片
                fs.writeFile(path.join(root_dir,image_file_dir+'/'+robotNameStr+'/'+imageTimePart+'/'+imageTimeInfo+'.png'), dataBuffer, function(err) {
                  if(err) 
                    console.log(err)
                })
              }              
          })
      }else{
          console.log('图片:'+imageTimeInfo+'.png 已转储')
      }

  })
    // If desired, we can unsubscribe from the topic as well.
    //listener.unsubscribe();
})

var listenerMark = new ROSLIB.Topic({
  ros : ros,
  name : '/detect/MarkInfo',
  messageType : 'rdws_cloud_platform_r/TargetArray'
});

listenerMark.subscribe(function(message) {
  //console.log('Received message on ' + listenerMark.name +  "time: "+JSON.stringify(message.header.stamp));
  //console.log('all message:'+stringify(message.targets))
  // console.log("length:"+message.targets.length)
  // console.log("id:"+message.targets[0].id)
  // console.log("prob:"+message.targets[0].prob)
  // console.log("int32_x:"+message.targets[0].x)
  // console.log("int32_y:"+message.targets[0].y)
  const imageTimeInfo = getTimeInfo(message.header.stamp)
  const imageTimePart = getTimePart(message.header.stamp)
  //mysql 操作
  for(var i = 0, len = message.targets.length; i<len ; i++){
    const sqlStr_bot_detect = {
      robot_name : robotNameStr,
      result_id : message.targets[i].id,
      result_prob: message.targets[i].prob,
      px_x: message.targets[i].x,
      px_y: message.targets[i].y,
      detect_time: new Date(message.header.stamp.secs * 1000),
      detect_image:path.join(root_dir_sql,image_file_dir+'/'+robotNameStr+'/'+imageTimePart+'/'+imageTimeInfo+'.png')
    }
    const sqlStr = 'INSERT INTO bot_detect SET ?'
    db.query(sqlStr,sqlStr_bot_detect,(err,results)=>{
        if(err){
            return console.log(err)
        }
        if(results.affectedRows === 1){
            console.log('插入成功')
        }
    })
  }
  //If desired, we can unsubscribe from the topic as well.
  //listenerMark.unsubscribe();
});



//简便插入
// const sqlStr_wat_detect = {
//     robot_name : 'wheeltec-zed2i-1',
//     result_id : 1,
//     result_prob: 1,
//     px_x: 256,
//     px_y: 266,
//     detect_time: message.header.stamp,
//     detect_image:'./.image_file/wheeltec-zed2i-1/2022-10-28-15/2022-10-28-15-0-4-482343904.png'
// }

// const dev_row = {
//     model_name:'wheeltec-zed2i-3',
//     model_desc:'wheeltec-zed2i-3'   
// }

// const sqlStr_ins_dev = 'INSERT INTO dev_model SET ?'
// const sqlStr_wat = 'INSERT INTO wat_detect SET ?'
// db.query(sqlStr_ins_dev,dev_row,(err,results)=>{
//     if(err){
//         return console.log(err)
//     }
//     if(results.affectedRows === 1){
//         console.log('插入成功')
//     }
        
// })
