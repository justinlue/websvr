/*
Main : start the server
treate the current folder as the default folder
*/
var urlMapper = new UrlMapper();
var webSvr = new WebSvr("./", 8000, urlMapper);
webSvr.start();

/*
UrlMapper example: close server
try it at: http://localhost:8000/admin/close
*/
urlMapper.add(/admin\/close/g, function(req, res){
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end("server is closed");
  webSvr.close();
});

/*
Map build.txt to tool/Combine.js
try it at: http://localhost:8000/build.txt
*/
urlMapper.add(/build.txt/, ["tool/Combine.js"]);

/*
Map post.htm, and write the post data on the data;
try it at: http://localhost:8000/post.htm
*/
urlMapper.parse(/post.htm/, function(req, res, data){
  res.write('<form action="" method="post">')
  res.write('<input name="input" />')
  res.write('</form><br/>');
  res.end(data);
});