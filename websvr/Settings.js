/*
Configurations
*/
var Settings = {
  //root folder of web
  root: "../",

  //list files in directory
  listDir: false,

  //http
  http: true,
  //default port of http
  port: 8054,

  //enable debug information output
  debug: false,
  //receive buffer,  default size 32k, i.e.: receive post data from ajax request
  bufferSize: 32768,

  //https
  https: false,
  //default port of https
  httpsPort: 8443,
  httpsOpts: { key:"", cert:"" },

  //logger file path
  logger:     "./tmp/log.txt",

  //session file stored here
  sessionDir: "./tmp/session",
  //session timeout, default is 20 minutes, in milliseconds
  sessionAge: 10000,

  //tempary upload file stored here
  uploadDir:  "./tmp/upload"
};
