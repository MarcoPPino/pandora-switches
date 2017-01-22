const Readable = require("stream").Readable;  
const util = require("util");  
util.inherits(MyStream, Readable);  
function MyStream(opt) {  
  Readable.call(this, opt);
}
MyStream.prototype._read = function() {};  
// hook in our stream
process.__defineGetter__("stdin", function() {  
  if (process.__stdin) return process.__stdin;
  process.__stdin = new MyStream();
  return process.__stdin;
});

// then Johnny-Five code goes below here

const five = require('johnny-five');
const board = new five.Board({
  repl: false
});


board.on("ready", function() {
  // create buttons
  const buttons = [];
  const $panels = $('.switch');

  for (var i = 0; i < 9; i++) {
    // const button = new five.Button({
    //   pin: i+2,
    //   isPullup: true
    // })
    // button.index = i;
    // button.on('press', function(){
    //   $panels.eq(this.index).addClass('active');
    // });
    // button.on('release', function(){
    //   $panels.eq(this.index).removeClass('active');
    // });
  }
  const switchy = new five.Pin({
    isPullup: true
  });
  switchy.read(function(err, val){
    console.log(val)
  })
});