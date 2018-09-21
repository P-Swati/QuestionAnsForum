var express = require('express');

var mysql = require('mysql');
var bodyParser = require('body-parser');
var currentQuestion=0;
var currentQuestionText='';
var loginflag=0;///#

/////////////////////////////////////database code//////////////////////////////////////

var pool = mysql.createPool({
  host: "localhost",
  user: "your username",
  password: "your password",
  database: "csi_demo"    
});
/*
pool.query('create database if not exists csi_demo', function (error, results, fields) {
  if (error) throw error;
  console.log('db created');
});
*/

pool.query('create table if not exists admins(AdminID INT PRIMARY KEY,AdminName VARCHAR(20) NOT NULL,Password VARCHAR(50) NOT NULL)', function (error, results, fields) {
  if (error) throw error;
  console.log('db created');
});

pool.query('create table if not exists ques_approved(qid INT PRIMARY KEY AUTO_INCREMENT,text TEXT,type VARCHAR(15),submittedBy VARCHAR(15) NOT NULL)', function (error, results, fields) {
  if (error) throw error;
  console.log('ques approved created');
});

pool.query('create table if not exists ques_unapproved(qid INT PRIMARY KEY AUTO_INCREMENT,text TEXT,type VARCHAR(15),submittedBy VARCHAR(15) NOT NULL)', function (error, results, fields) {
  if (error) throw error;
  console.log('ques unapproved created');
});

pool.query('create table if not exists ans_approved(aid INT PRIMARY KEY AUTO_INCREMENT,qid INT,text TEXT,submittedBy VARCHAR(15) NOT NULL,FOREIGN KEY (qid) REFERENCES ques_approved(qid))', function (error, results, fields) {
  if (error) throw error;
  console.log('ans approved created');
});

pool.query('create table if not exists ans_unapproved(aid INT PRIMARY KEY AUTO_INCREMENT,qid INT,qText TEXT,text TEXT,submittedBy VARCHAR(15) NOT NULL,FOREIGN KEY (qid) REFERENCES ques_approved(qid))', function (error, results, fields) {
  if (error) throw error;
  console.log('ans unapproved created');
});



//////////////////////////////////////////app code///////////////////////////////////////

app=express();
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/src'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine','ejs');

app.get('/',function(req,res){
  //  res.send('hello!');
    res.render('home.ejs',{questions : []});
});

app.get('/csi_ques',function(req,res){
  //  res.send('csi ques display');
    fetchQuestions('csi',res);
});

app.get('/workshop_ques',function(req,res){
   // res.send('workshop ques display');
    fetchQuestions('workshop',res);
});

app.get('/general_ques',function(req,res){
  //  res.send('other ques display');
    fetchQuestions('general',res);
});

app.get('/viewdetails/:id',function(req,res){
    var ques_id=req.params.id;
    var arrayRender =[];
    var innerarray=[];
    currentQuestion=req.params.id;
    //res.send('details of ques no '+ques_id);
    
    pool.getConnection(function(err,con){
        if (err) throw err;
        
        var sql='SELECT * FROM ques_approved WHERE qid=(?)';
        con.query(sql,[ques_id],function(error,result){
       
            console.log(ques_id+' ques fetched');
            arrayRender.push(result[0].qid);
            arrayRender.push(result[0].text);
            currentQuestionText = result[0].text;
            if(error) throw error;
            else{
                
                sql='SELECT * FROM ans_approved WHERE qid=(?)';
                con.query(sql,[ques_id],function(error,result){
                    console.log('sec callback');
                    result.forEach((row)=>{
                         innerarray=[];
                         innerarray.push(row.aid);
                         innerarray.push(row.text);
                         innerarray.push(row.submittedBy);
                         arrayRender.push(innerarray);
                    });
                    //console.log(arrayRender);
                   // res.send(arrayRender);
                    res.render('viewdetails.ejs',{ques_ans : arrayRender}); //render one ques and all its ans
                    con.release();
                    if(error) throw error;
                });
                
            }
        });
    });
    
});

app.post('/submitQues',function(req,res){
    console.log(req.body);
    var text = req.body.Question;
    var name = req.body.Name;
    var anonymous = req.body.Anonymous;
    var type = req.body.type;
    var valArray=[];
    
    pool.getConnection(function(err,con){
        if (err) throw err;
        var sql='INSERT INTO ques_unapproved(text,type,submittedBy) VALUES (?,?,?)';
        if (name){
           valArray=[text,type,name];
        }
        else{
            valArray=[text,type,'anonymous'];
        }
        
         con.query(sql,valArray,function(error,result){
               console.log('inserted new question');
               con.release();
               if(error) throw error;
        });
        
    });
    res.redirect('/');
});



app.post('/submitAns',function(req,res){
    console.log(req.body);
    var text = req.body.Answer;
    var name = req.body.Name;
    var anonymous = req.body.Anonymous;
    var valArray=[];
    
    pool.getConnection(function(err,con){
        if (err) throw err;
        var sql='INSERT INTO ans_unapproved(qid,qText,text,submittedBy) VALUES (?,?,?,?)';
        if (name){
           valArray=[currentQuestion,currentQuestionText,text,name];
        }
        else{
            valArray=[currentQuestion,currentQuestionText,text,'anonymous'];
        }
        
         con.query(sql,valArray,function(error,result){
               console.log('inserted new answer');
               con.release();
               if(error) throw error;
        });
        
    });
    res.redirect('/viewdetails/'+currentQuestion);
});



//////////////////////////////////////////admin routes///////////////////////////////////



app.get('/adminLogin',function(req,res){
    res.render('admin-login.ejs',{msg:''});
});

app.post('/adminLogin',function(req,res){
  //  res.send('other ques display');
    var adminID = req.body.adminID;
    var pass = req.body.password;
    
    pool.getConnection(function(err,con){
        if (err) throw err;
        
        var sql='SELECT * FROM admins WHERE AdminID=(?) AND Password=(?)';
        con.query(sql,[adminID,pass],function(error,result){
            if (!result.length){
                //res.send('wrong credentials');
                res.render('admin-login.ejs',{msg : 'wrong credentials'});
            }
            else{
                //res.send('hello admin!');
                res.redirect('/adminDashboard');
                loginflag=1;
            }
            
        });
    });
    
});
   
app.get('/adminDashboard',isLoggedIn,function(req,res){////////#
  //  res.send('admin dashboard');
    res.render('dashboard.ejs',{newQues:[]});
   
});

app.get('/adminLogout',function(req,res){/////////#
    loginflag=0;
    res.redirect('/adminLogin');
    
});

app.get('/viewSubmittedQuestions',isLoggedIn,function(req,res){
   // res.send('viewquestions');
    
    pool.getConnection(function(err,con){
        if (err) throw err;
        
        var sql='SELECT * FROM ques_unapproved';
        con.query(sql,function(error,result){
            if (!result.length){
            //    res.send('no new ques submitted');
                res.render('dashboard.ejs',{newQues:[]}); //check in ejs file if result length =0 then display msg
               
            }
            else{
                //res.send(result);
                res.render('dashboard.ejs',{newQues : result});
            }
            con.release();
            if (error) throw error;
        });
    });
    
    
    //res.render('dashboard.ejs',{renderData :});
});

/*
app.get('/viewSubmittedAnswers',async function(req,res){
    //res.send('viewanswers');
    var new_answers=[];
    var arrayRender=[];
    var finalArray=[];
    var temp='';
    new_answers = await searchAnswers();

    
    for(let i=0;i<new_answers.length;i=i+1){
        finalArray.push(new_answers[i]);
        temp = await searchQuestion(arrayRender,new_answers[i].qid);
        finalArray.push(temp);
    }
    
    res.render('dashboard2.ejs',{newAns : finalArray});
});  */

app.get('/viewSubmittedAnswers',isLoggedIn,function(req,res){
    
    pool.getConnection(function(err,con){
            if (err) throw err;

            var sql='SELECT * FROM ans_unapproved';
            con.query(sql,function(error,result){
                if (!result.length){
                    res.render('dashboard2.ejs',{newAns:[]}); //check in ejs file if result length =0 then display msg
                }
                else{
                   // res.send(result);
                   //resolve(result);
                    res.render('dashboard2.ejs',{newAns : result});
                }
                con.release();
                if (error) throw error;
            });//callback
    });
    
    
});

app.get('/approveQues/:id',isLoggedIn,function(req,res){
    var qid = req.params.id;
 
    pool.getConnection(function(err,con){
    if (err) throw err;
    
            var sql='SELECT * FROM ques_unapproved WHERE qid=(?)';    
            //var sql='DELETE FROM ques_unapproved WHERE qid=(?)';
            con.query(sql,[qid],function(error,result1){
              //  var store = result;

             //   console.log(store);

                if(error) throw error;

                else{

                    sql='DELETE FROM ques_unapproved WHERE qid=(?)';
                    con.query(sql,[qid],function(error,result){
                        console.log('ques delete nested callback');
                        res.redirect('/viewSubmittedQuestions');
                        if(error) throw error;
                    });

                    sql='INSERT INTO ques_approved(text,type,submittedBy) VALUES (?,?,?)';
                    con.query(sql,[result1[0].text,result1[0].type,result1[0].submittedBy],function(error,result){
                       console.log('ques insert approved table');
                        if(error) throw error;
                    });

                }

                //con.release();
            });//query ends here
        
        
    });
   // res.redirect('/viewSubmittedQuestions');
});
        

app.get('/deleteQues/:id',isLoggedIn,function(req,res){
    var qid = req.params.id;
 
    pool.getConnection(function(err,con){
    if (err) throw err;
    
            var sql='DELETE FROM ques_unapproved WHERE qid=(?)';    

            con.query(sql,[qid],function(error,result){
                con.release();
                res.redirect('/viewSubmittedQuestions');
                if(error) throw error;
            });//query ends here
    });
   // res.redirect('/viewSubmittedQuestions');
});



app.get('/approveAns/:id',isLoggedIn,function(req,res){
    var qid = req.params.id;
 
    pool.getConnection(function(err,con){
    if (err) throw err;
    
            var sql='SELECT * FROM ans_unapproved WHERE aid=(?)';    
            //var sql='DELETE FROM ques_unapproved WHERE qid=(?)';
            con.query(sql,[qid],function(error,result1){
              //  var store = result;

             //   console.log(store);

                if(error) throw error;

                else{

                    sql='DELETE FROM ans_unapproved WHERE aid=(?)';
                    con.query(sql,[qid],function(error,result){
                        res.redirect('/viewSubmittedAnswers');
                        if(error) throw error;
                    });

                    sql='INSERT INTO ans_approved(qid,text,submittedBy) VALUES (?,?,?)';
                    con.query(sql,[result1[0].qid,result1[0].text,result1[0].submittedBy],function(error,result){
                        if(error) throw error;
                    });
                }
                //con.release();
            });//query ends here
        
        
    });
    //res.redirect('/viewSubmittedAnswers');
});
        

app.get('/deleteAns/:id',isLoggedIn,function(req,res){
    var qid = req.params.id;
 
    pool.getConnection(function(err,con){
    if (err) throw err;
    
            var sql='DELETE FROM ans_unapproved WHERE aid=(?)';    

            con.query(sql,[qid],function(error,result){
                con.release();
                res.redirect('/viewSubmittedAnswers');
                if(error) throw error;
            });//query ends here
    });
   // res.redirect('/viewSubmittedAnswers');
});




////////////////////////////////////listen to port/////////////////////////////////////////

app.listen(8000,function(){
    console.log('server listening on port 8000');
});

//////////////////////////////////////////functions/////////////////////////////////////////


function fetchQuestions(quesType,res){
    
    pool.getConnection(function(err,con){
        if (err) throw err;
        
        var sql='SELECT * FROM ques_approved WHERE type=(?)';
        con.query(sql,[quesType],function(error,result){
       
            console.log(quesType+' ques fetched');
            //res.send(result);
            res.render('home.ejs',{questions : result});  // display all ques of particular type on home
            con.release();
            if(error) throw error;
        });
    });
    
}

function searchAnswers(){
    return new Promise((resolve,reject)=>{
        
        pool.getConnection(function(err,con){
            if (err) throw err;

            var sql='SELECT * FROM ans_unapproved';
            con.query(sql,function(error,result){
                if (!result.length){
                    //res.render('dashboard2.ejs',{newAns:[]}); //check in ejs file if result length =0 then display msg
                }
                else{
                   // res.send(result);
                   resolve(result);
                  //  res.render('dashboard2.ejs',{newAns : result});
                }
                con.release();
                if (error) throw error;
            });//callback
    });//pool
        
        
    });//promise
}

function searchQuestion(arrayRender,qid){  
    return new Promise((resolve,reject)=>{
        pool.getConnection(function(err,con){
            if(err) throw err;
            sql = 'SELECT text FROM ques_approved WHERE qid=(?)';
            con.query(sql,[qid],function(error,result1){
               // console.log(result1[0].text);
                arrayRender=[];
                arrayRender.push(result1[0].text);
               // console.log(arrayRender);
                resolve(arrayRender);
            });
            
        });
        
        
    });
}

function isLoggedIn(req,res,next){
    if(loginflag===1){
        return next();
    }
    res.redirect('/adminLogin');
}