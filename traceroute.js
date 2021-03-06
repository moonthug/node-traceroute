var child = require('child_process'),
    net = require('net'),
    dns = require('dns'),
    isWin = (/^win/.test(require('os').platform()));

function createArgString(host, options) {
  var args = {},
    argString = '';

  if(isWin) {

  }
  else {
    args.q = options.nqueries || 1;
    args.n = '';

    if (options.max_ttl) args.m = options.max_ttl;
  }

  for(var flag in args) {
    argString += ' -' + flag + ' ' + args[flag];
  }
  return argString + ' ' + host;
}

function parseHop(line) {
  line = line.replace(/\*/g,'0');
  if (isWin) line = line.replace(/\</g,'');
  var s = line.split(' ');
  for (var i=s.length - 1; i > -1; i--) {
    if (s[i] === '') s.splice(i,1);
    if (s[i] === 'ms') s.splice(i,1);
  }

  if (isWin) return parseHopWin(s);
  else return parseHopNix(s);
}

function parseHopWin(line) {
  if (line[4] === 'Request')
    return false;

  var hop = {};
  hop[line[4]] = [ +line[1], +line[2], +line[3]];

  return hop;
}

function parseHopNix(line) {
  if (line[1] === '0') 
    return false;
  
  var hop = {},
      lastip = line[1];

  hop[line[1]] = [+line[2]];

  for (var i=3; i < line.length; i++) {
    if (net.isIP(line[i])) {
      lastip = line[i];
      if (!hop[lastip])
        hop[lastip] = [];
    }
    else hop[lastip].push(+line[i]);
  }

  return hop;
}

function parseOutput(output,cb) {
  var lines = output.split('\n'),
      hops=[];

  lines.shift();  
  lines.pop();

  if (isWin) { 
    for (var i = 0; i < lines.length; i++)
      if (/^\s+1/.test(lines[i]))
        break;
    lines.splice(0,i);
    lines.pop(); lines.pop();
  }

  for (var i = 0; i < lines.length; i++)
    hops.push(parseHop(lines[i]));

  cb(null,hops);
}

function trace(host,options,cb) {
  if(typeof options == 'function') {
      cb = options;
      options = {};
  }

  dns.lookup(host, function (err) {
    if (err && net.isIP(host) === 0)
      cb('Invalid host');
    else {
      var traceroute;
      var argString = createArgString(host, options);

      if (isWin) {
        traceroute = child.exec('tracert -d ' + host, function (err,stdout,stderr) {
          if (!err)
            parseOutput(stdout,cb);
        });
      }
      else {
        traceroute = child.exec('traceroute' + argString, function (err,stdout,stderr) {
        if (!err)
          parseOutput(stdout,cb);
        });
      }
    }
  });
}

exports.trace = function (host,options,cb) {
  host = host + '';
  trace(host.toUpperCase(),options,cb);
}
