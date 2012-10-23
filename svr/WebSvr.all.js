/*ref\Math.uuid.js*/
/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

/*
 * Generate a random uuid.
 *
 * USAGE: Math.uuid(length, radix)
 *   length - the desired number of characters
 *   radix  - the number of allowable values for each character.
 *
 * EXAMPLES:
 *   // No arguments  - returns RFC4122, version 4 ID
 *   >>> Math.uuid()
 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
 *
 *   // One argument - returns ID of the specified length
 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
 *   "VcydxgltxrVZSTV"
 *
 *   // Two arguments - returns ID of the specified length, and radix. (Radix must be <= 62)
 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
 *   "01001010"
 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
 *   "47473046"
 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
 *   "098F4D35"
 */
(function() {
  // Private array of chars to use
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

  Math.uuid = function (len, radix) {
    var chars = CHARS, uuid = [], i;
    radix = radix || chars.length;

    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }

    return uuid.join('');
  };

  // A more performant, but slightly bulkier, RFC4122v4 solution.  We boost performance
  // by minimizing calls to random()
  Math.uuidFast = function() {
    var chars = CHARS, uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('');
  };

  // A more compact, but less performant, RFC4122v4 solution:
  Math.uuidCompact = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
})();

/*ref\Object.extend.js*/
Object.extend = function(des, src){

  if(!des) des = {};

  for(var p in src){
    if(!des[p]) des[p] = src[p];
  }

  return des;
}
/*RequestParser.js*/
/*
Request parser, parse the data in request body via 
when parse complete, execute the callback, with response data;
*/
var RequestParser;

(function(){

  //TODO: Is there a bug, how about 2 users update a file, what's will happened for buffer;
  var MAX_SIZE = 16 * 1024 * 1024,
      buffer = new Buffer(MAX_SIZE);

  RequestParser = function(req, res, callback){
    var length = 0, data = "";

    req.on('data', function(chunk) {
      chunk.copy(buffer, length, 0, chunk.length);
      length += chunk.length;
    });

    req.on('end', function() {
      data = length > 0 ? buffer.toString('utf8', 0, length) : "";
      callback(data);
    });
  };

}());
/*SessionParser.js*/

var SessionParser;

//TODO: Need a child process of clear session
(function(){

  var fs = require("fs");

  SessionParser = (function(req, res, callback){

    var self = {
      //session id
      sid : null,
      //session stored object
      obj : {}
    };

    //TODO
    self.set = function(key, val, callback){

      var sessionfile = 'tmp/session/' + self.sid;

      key && (self.obj[key] = val);

      fs.writeFile( sessionfile, JSON.stringify(self.obj), function(err){
        if(err){
          console.log(err);
          return;
        }

        callback && callback(self);
      });
    };

    //TO DO
    self.get = function(key){
      return self.obj[key];
    };

    self.init = function(){
      var sidKey = "_wsid",
          sidVal,
          cookie = req.headers.cookie || "";

      //Get or Create sid
      var idx = cookie.indexOf(sidKey + "=");

      //sid exist in the cookie, read it
      (idx >= 0) && (sidVal = cookie.substring(idx + 6, idx + 38));

      //sid doesn't exist, create it;
      if(idx < 0 || sidVal.length != 32){
        sidVal = Math.uuid(32);
        res.setHeader("Set-Cookie", " _wsid=" + sidVal + "; path=/");
      };
      self.sid = sidVal;

      //We only receive the cookie from Http headers
      var sessionfile = 'tmp/session/' + self.sid;

      //here will be cause a bit of delay
      fs.exists(sessionfile, function (exists) {
        if(exists){
          fs.readFile( sessionfile, function (err, data) {
            if (err) {
              console.log(err);
              return;
            };
            data = data || "{}";
            self.obj = JSON.parse(data);

            callback(self);
          });
        }else{
          //session not exist create one
          self.obj = {};
          self.set(null , null , callback);
        }
      });

    };

    self.init();

    return self;

  });

}());
/*Parser.js*/
/*
Parser: Functions that Filter and Handler will be called 
*/
var Parser = function(req, res, mapper){

  var handler = mapper.handler;

  //add sesion support
  var parseSession = function(){
    //add sesion support
    if(mapper.session && typeof req.session == "undefined"){
      SessionParser(req, res, function(session){
        req.session = session;
        handler(req, res);
      });
    }else{
      handler(req, res);
    }
  };

  /*
  parse data in request, this should be done before parse session,
  because session stored in file
  */
  var parseRequest = function(){
    //need to parse the request?
    if(mapper.parse && typeof req.body == "undefined"){
      //Must parser the request first, or the post data will lost;
      RequestParser(req, res, function(data){
        req.body = data;
        parseSession();
      });
    }else{
      parseSession();
    }
  };

  /*
  parse file in request, this should be at the top of the list
  */
  var parseFile = function(){
    //Need to parse the file in request?
    if(mapper.file && typeof req.body == "undefined"){
      //Must parser the request first, or the post data maybe lost;
      var formidable = require('./lib/incoming_form');

      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        if (err){
          console.log(err);
          return;
        };

        //attach the parameters and files
        req.body = fields;
        req.files = files;

        //in fact request will not be parsed again, because body is not undefined
        parseRequest();
      });
    }else{
      parseRequest();
    };
  };

  parseFile();

};

/*Filter.js*/
/*
Http Filter: Execute all the rules that matched,
Filters will be always called before a handler. 
*/
var Filter = {
  //filter list
  filters : [],
  
  /*
  add a new filter
  */
  add : function(regExp, handler, options){
    var params = {regExp: regExp, handler: handler};
    Filter.filters.push(Object.extend(params, options));
  },

  /*
  file receiver: it's a specfic filter,
  this filter should be always at the top of the filter list
  */
  file: function(regExp, handler, options){
    var params = {regExp: regExp, handler: handler, file: true};
    //insert as the first elements
    Filter.filters.splice(0, 0, Object.extend(params, options));
  }
};

/*
Filter Chain
*/
var FilterChain = function(cb){
  var self = this;
  self.idx = 0;
  self.cb = cb;
};

FilterChain.prototype = {
  next : function(req, res){
    var self = this;

    var mapper = Filter.filters[self.idx++];

    //filter is complete, execute callback;
    if(!mapper) return self.cb && self.cb();

    /*
    If not Matched go to next filter
    If matched need to execute the req.next() in callback handler,
    e.g:
    webSvr.filter(/expression/, function(req, res){
      //filter actions
      req.next(req, res);
    }, options);
    */
    if(mapper.regExp && mapper.regExp.test(req.url)){
      console.log("filter matched", self.idx, mapper.regExp, req.url);
      Parser(req, res, mapper);
    }else{
      self.next(req, res);
    }
  }
};
/*Handler.js*/
/*
Http Handler: Execute and returned when when first matched;
At the same time only one Handler will be called;
*/
var Handler;

(function(){

  /*
  Private: web server instance
  */
  var webSvr;

  /*
  Private: handler list
  */
  var handlers = [];

  /*
  Static Handler instance
  */
  Handler = {

    url : function(regExp, handler, options){
      var params = {regExp: regExp, handler: handler};
      handlers.push(Object.extend(params, options));
    },

    //Post: Parse the post data by default;
    post : function(regExp, handler, options){
      var params = { parse: true };
      this.url(regExp, handler, Object.extend(params, options));
    },

    //Session: Parse the session and post by default;
    session : function(regExp, handler){
      this.url(regExp, handler, { parse:true, session: true });
    },

    handle : function(req, res){
      //flag: is matched?
      for(var i = 0, len = handlers.length; i < len ; i++){

        var mapper = handlers[i];
        if(mapper.regExp && mapper.regExp.test(req.url)){

          console.log("handler matched", i, mapper.regExp, req.url);

          try{
            var handler = mapper.handler,
                type = handler.constructor.name;

            switch(type){
              //function: treated it as custom function handler
              case "Function":
                Parser(req, res, mapper);
                break;

              //string: treated it as content
              case "String":
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(handler);
                break;

              //array: treated it as a file.
              case "Array":
                res.writeFile(handler[0]);
                break;
            }
          }
          catch(err){ 
            console.log(err)
          }

          return true;
        }
      }
      return false;
    }   //end of handler

  };

}());




/*WebSvr.js*/
/*
* Description: Create a static file server (http based).
*              This will list all the files and directories via Node.Js.
*              The behavior will be like directory browsing enabled in IIS,
* Author: Kris Zhang
* Dependence: Node.js: http://www.nodejs.org,
*             mime.js: https://github.com/bentomas/node-mime
*             Math.uuid.js (v1.4) : http://www.broofa.com
* Date: 2012-3 Draft
*       2012-4 Update: Using async and mime.js
*       2012-7 Update: Rename and reformat files
*/
/*
* WebSvr Namespace
*/
var WebSvr = (function(){

  var defaults = {
    //Server port
    port: 8054,
    //Root path
    root: "./../web",
    session: false,
  };

  var server = function(options){
    //Library
    var fs = require("fs"),
      path = require("path"),
      mime = require("./lib/mime");

    //Parameters
    //Count: How many files?
    var self = this,
        count = 0,
        root,
        port;

    var urlFormat = function(url){
      url = url.replace(/\\/g,'/');
      url = url.replace(/ /g,'%20');
      return url;
    };

    //Align to right
    var date = function(date){
      var d = date.getFullYear() 
        + '-' + (date.getMonth() + 1)
        + '-' + (date.getDay() + 1)
        + " " + date.toLocaleTimeString();
      return "                ".substring(0, 20 - d.length) + d;
    };

    //Align to left
    var size = function(num){
      return num + "                ".substring(0, 12 - String(num).length);
    };

    var anchor = function(txt, url){
      url = url ? url : "/";
      return '<a href="' + url + '">' + txt + "</a>";
    };

    var fileHandler = function(req, res){

      var url = req.url,
          hasQuery = url.indexOf("?");

      //Bug: path.join can't recognize the querystring;
      url = hasQuery > 0 ? url.substring(0, hasQuery) : url;

      var fullPath = path.join(root, url);

      fs.stat(fullPath, function(err, stat){

        count = 0;

        //Consider as file not found
        if(err) return self.write404(res);

        //List all the files in a directory.
        var listFiles = function(callback){

          fs.readdir(fullPath, function(err, files){
            if(err){
              console.log(err);
              return;
            }

            for(var idx = 0, len = files.length; idx < len; idx++){
              //Persistent the idx before make the sync process
              (function(idx){
                var filePath = path.join(fullPath, files[idx]),
                    fileUrl = urlFormat(path.join(url, files[idx]));

                fs.stat(filePath, function(err, stat){
                  count++;

                  if(err){
                    console.log(err);
                  }else{
                    res.write(
                      date(stat.mtime)
                      + "\t" + size(stat.size)
                      + anchor(files[idx], fileUrl)
                      + "\r\n"
                    );
                  }

                  count == len && callback();
                });
              })(idx);
            }

            //If it's an empty directory
            (len == 0) && callback();
          });
        };

        //Is file? Open this file and send to client.
        if(stat.isFile()){
          writeFile(res, fullPath);
        }

        //Is Directory? List all the files and folders.
        else if(stat.isDirectory()){
          res.writeHead(200, {"Content-Type": "text/html"});
          res.write("<h2>http://" + req.headers.host + url + "</h2><hr/>");
          res.write("<pre>");
          res.write(anchor("[To Parent Directory]", url.substr(0, url.lastIndexOf('/'))) + "\r\n\r\n");
          listFiles(function(){
            res.write("</pre><hr/>");
            res.end("<h5>Count: " + count + "</h5>");
          });
        }

      });
    };

    var requestHandler = function(req, res){
      //Response may be shutdown when do the filter, in order not to cause exception,
      //Rewrite the write/writeHead functionalities of current response object
      var endFn = res.end;
      res.end = function(){
        //Execute old end;
        endFn.apply(res, arguments);
        //Rewirte write/writeHead on response object
        res.write = res.writeHead = function(){
          console.log("response is already end, response write ignored!")
        };
      };

      res.writeFile = function(filePath, cb){
        self.writeFile(res, filePath, cb);
      };

      //Define filter object
      req.filter = new FilterChain(function(){
        //if handler not match, send the request
        !Handler.handle(req, res) && fileHandler(req, res);
      });

      //Handle the first filter
      req.filter.next(req, res);
    };

    var writeFile = function(res, fullPath){
      fs.readFile(fullPath, function(err, data){
        if(err){
          console.log(err);
          return;
        }
        res.writeHead(200, { "Content-Type": mime.lookup(fullPath) });
        res.end(data, "binary");
      });
    };

    //Explose API
    //Filter
    self.filter = Filter.add;
    self.file = Filter.file;

    //Handler
    self.url = Handler.url;
    self.post = Handler.post;
    self.session = Handler.session;

    //Get a fullpath of a request
    self.getFullPath = function(filePath){
      return path.join(root, filePath);
    };

    //Write file, filePath is a relative;
    self.writeFile = function(res, filePath, cb){
      filePath = path.join(root, filePath);
      fs.exists(filePath, function(exist){
        if(exist){
          writeFile(res, filePath);
          cb && cb(exist);
        }else{
          //If callback function doesn't exist, write 404 page;
          cb ? cb(exist) : self.write404(res);
        }
      });
    };

    self.write404 = function(res){
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end("File not found!");
    };

    //Public: start http server
    self.start = function(){
      options = options || {};

      Object.extend(options, defaults);

      root = options.root;
      port = parseInt(options.port);

      //Expose the API
      self.options = options;

      try{
        //Create http server
        var httpSvr = require("http").createServer(requestHandler);
        httpSvr.listen(port);

        console.log("Running at"
          ,"Root:", root
          ,"Port:", port
        );

        self.httpSvr = httpSvr;

        return true;
      }
      catch(err){
        console.log("Can't setup server at port", port, err);
      }
      return false;
    };

    //Public: close http server;
    self.close = function(){
      if(self.httpSvr){
        self.httpSvr.close();
        return true;
      }
      return false;
    };

  };

  return server;

})();
/*SiteTest.js*/

//Start the WebSVr, runnting at parent folder, default port is 8054, directory browser enabled;
//Trying at: http://localhost:8054
var webSvr = new WebSvr({root:"./../"});
webSvr.start();


var	fs = require("fs"),
    querystring = require("querystring");


/*
Filter: test/* => (session validation function);
  parse:parse the post data and stored to req.body;
  session: init the session and stored in req.session; 
*/
webSvr.filter(/test\/[\w\.]+/, function(req, res){
  //It's not index.htm/login.do, do the session validation
  if(req.url.indexOf("index.htm") < 0 && req.url.indexOf("login.do") < 0){
    !req.session.get("username") && res.end("You must login, first!");
  }

  //Link to next filter
  req.filter.next(req, res);
}, {parse: true, session: true});


/*
Handler: login.do => (validate the username & password)
  username: admin
  password: 12345678
*/
webSvr.url(/login.do/, function(req, res){
  //TODO: Add an parameter to auto-complete querystring.parse(req.body);
  var qs = querystring.parse(req.body);
  if(qs.username == "admin" && qs.password == "12345678"){
    //Put key/value pair in session
    //TODO: Support put JSON object directly
    req.session.set("username", qs.username, function(session){
      //TODO: Add req.redirect / req.forward functionalities;
      res.writeHead(200, {"Content-Type": "text/html"});
      res.writeFile("/test/setting.htm");
    });
  }else{
    res.writeHead(401);
    res.end("Wrong username/password");
  }
});


/*
Uploader: upload.do => (receive handler)
*/
webSvr.file(/upload.do/, function(req, res){
  res.writeHead(200, {"Content-Type": "text/plain"});
  //Upload file is stored in req.files
  //form fields is stored in req.body
  res.write(JSON.stringify(req.body));
  res.end(JSON.stringify(req.files));
});


/*
Simple redirect API:
*/
//Mapping "combine" to tool/Combine.js, trying at: http://localhost:8054/combine
webSvr.url(/combine/, ["svr/tool/Combine.js"]);
//Mapping "hello" to a string, trying at http://localhost:8054/hello
webSvr.url(/hello/, "Hello WebSvr!");
//Mapping "post" and parse the post in the request, trying at: http://localhost:8054/post
webSvr.post(/post/, function(req, res){
  res.writeHead(200, {"Content-Type": "text/html"});
  //Need session support
  res.write("You username is " + req.session.get("username"));
  res.write('<form action="" method="post"><input name="input" /></form><br/>');
  res.end('Received : ' + req.body);
}, {session: true});