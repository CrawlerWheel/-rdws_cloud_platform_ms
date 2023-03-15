const express = require('express')
const mysql = require('mysql')
var bodyParser = require('body-parser');

const app = express()
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// //------------数据库配置--------------
// const db = mysql.createPool({
//     host: '',
//     user: 'root',
//     password: 'admin',
//     database: 'my_db'
// })

// //mysql 操作

// //--插入数据
// //待执行的sql语句可以用？进行占位
// const sqlStr = 'INSERT INTO xxx ( , , , ) VALUES(? ,?, ? ,? )'
// db.query(sqlStr,[数组从而填充问号],(err,results)=>{
//     if(err){
//         return console.log(err)
//     }
//     console.log('mysql',results)
//     if(results.affectedRows === 1) console.log('插入成功')
// })

// //简便插入
// const sqlStr_wat_detect = {
//     robot_name : 'wheeltec-zed2i-1',
//     result_id : 1,
//     result_prob: 1,
//     px_x: 256,
//     px_y: 266,
//     detect_time: message.header.stamp,
//     detect_image:'./.image_file/wheeltec-zed2i-1/2022-10-28-15/2022-10-28-15-0-4-482343904.png'
// }
// const sqlStr_simple = 'INSERT INTO wat_detect SET ?'
// db.query(sqlStr_simple,sqlStr_wat_detect,(err,results){
//     if(err){
//         return console.log(err)
//     }
//     if(results.affectedRows === 1){
//         console.log('插入成功')
//     }
        
// })

//------------配置静态资源访问----------------
//app.use(express.static('./pubic'))
//app.use('/public',express.static('./pubic')) //追加访问路径

//-----------------路由--------------------
const switch_state = false
app.listen(80,()=>{
    console.log('server is access')
})

//路由最简单用法，直接将路由挂载在express实例上
app.post('/switch',function(req,res){
     res.send({
        post_result : 'successsss'
     })
})

app.post('/switchhhh',function(req,res){
    console.log(JSON.stringify(req.body))
    console.log(req.body.robot_name)
    res.send({
        pos: req.body.robot_name,
        post_result : 'successsss'
    })
})


app.get('/switch',function(req,res){
    res.send({
       post_result : 'success'
    })
})
//动态匹配url参数
app.get('/switch/:id',function(req,res){
    console.log(req.params)
    res.send(
        req.params.id 
    )
})

