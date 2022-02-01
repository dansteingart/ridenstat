
parts = process.argv;

//const mqtt = require('mqtt')
//const bsq3 = require('better-sqlite3');

var ModbusRTU = require("modbus-serial");
var modbus = new ModbusRTU();
var bodyParser = require('body-parser');
var app = require('express')();
var fs = require('fs');
var cors = require('cors')
const server = require('http').createServer(app);
var io = require('socket.io')(server,{cors:{methods: ["GET", "POST"]}});
server.listen(3000);


var SerialPort = require("serialport"); //per ak47 fix
const Readline = require('@serialport/parser-readline')

var serialPort = new SerialPort("/dev/ttyACM0",{baudRate: 115200});
const parser = serialPort.pipe(new Readline({ delimiter: '\r\n' }))

serialPort.on("open",() =>{console.log('open');});  
parser.on('data', (data) => {out = process_data(data);io.emit('data',out);log(out);});
modbus.connectRTUBuffered("/dev/ttyUSB0", { baudRate: 115200 }); 

dird = "files"
for (p in parts)
{
  if (parts[p].search("--dird")>-1)
  {
    dird=parts[p].split("=")[1];
    console.log(dird);
  }

}

lt = 0;
queue = []

function process_queue(){if (queue.length >0){ex = queue.shift();ex[0](ex[1]);}}

function process_data(str)
{
  parts = str.split(",")
  out = {}
  out['type'] = 'data';
  out['voltage'] = parseFloat(parts[0])
  out['current'] = parseFloat(parts[1])
  out['time'] = new Date().getTime();

  return out
}

function process_status(regs)
{
    voltres = 100.
    ampres = 100.

    isign = 1;
    if (regs[4]) vsign = -1

    esign = 1;
    if (regs[34]) tsign = -1

    out = {}
    out['type'] = 'status'
    out['internal_temp'] = isign * regs[5]
    out['probe_temp'] = esign * regs[35]
    out['m_vol'] = regs[10] / voltres //V
    out['m_cur'] = regs[11] / ampres //A
    out['m_eng'] = regs[12]/1000 //Wh
    out['m_pow'] = regs[13]/100  //W
    out['s_vol'] = regs[8] / voltres
    out['s_cur'] = regs[9] /  ampres
    out['p_vol'] = regs[82] / voltres
    out['p_cur'] = regs[83] / ampres
    out['enabled'] = regs[18];
    out['time'] = new Date().getTime();
    out['td'] = out['time'] - lt;
    lt = out['time'] 
    return out
}


function read_status(){modbus.readHoldingRegisters(0,84).then((data)=>{ddata = process_status(data['data']);io.emit("status",ddata);log(ddata);})}

function enable(val)
{
    if (val != 1) val = 0;
    console.log(val);
    modbus.writeRegisters(18,[val]);
    return val;
}


function set_voltage(val){console.log(val);modbus.writeRegisters(8,[parseInt(val*100)])}
function set_current(val){console.log(val);modbus.writeRegisters(9,[parseInt(val*100)])}

setInterval(()=> {queue[queue.length] = [read_status,undefined]},1000);
setInterval(()=>process_queue(),200);



//Web stuff
//Enable Cross Site Scripting
app.use(cors());

//Allows us to rip out data?
app.use(bodyParser.urlencoded({extended:true})); //deprecated not sure what to do here....

function clone(a) {return JSON.parse(JSON.stringify(a));}

function log(thing)
{

  if (logfile != undefined)
  {
    keys = []
    vals = []
    ttable = clone(thing['type'])
    delete thing['type']
    fil = `${dird}/${logfile}_${ttable}.csv`
    for (i in thing) keys.push(i)
    for (k in keys) vals.push(thing[keys[k]])
    if (!fs.existsSync(fil))     fs.writeFileSync(fil,keys+"\n");
    fs.appendFile(fil,vals+"\n",(ev)=>{});

    // //client.publish(`es/data/rd6018/${logfile}/${thing['type']}`,JSON.stringify(thing));
    // db = bsq3(`${logfile}.db`)
    // sql1 = `CREATE TABLE IF NOT EXISTS ${ttable}(${keys.toString()})`
    // db.exec(sql1)
    // sql1 = `INSERT INTO ${ttable}(${keys.toString()}) VALUES (${vals.toString()})`
    // db.exec(sql1);
  }
}

logfile = undefined
app.post("/logging" ,(req,res)=>{logfile = req.body['logfile'];res.send({'status':'success','logging':logfile})});
app.post("/enable" ,(req,res)=>{res.send({'status':'success','enable':enable(1)})})
app.post("/disable",(req,res)=>{res.send({'status':'success','enable':enable(0)})})
app.post("/set_voltage",(req,res)=>{res.send({'status':'success','enable':set_voltage(req.body['voltage'])})})
app.post("/set_current",(req,res)=>{res.send({'status':'success','enable':set_current(req.body['current'])})})

//weak interface
app.get('/', function(req, res){res.sendFile(__dirname + '/index.html');});

//sockets
io.on('connection', (socket)=> {socket.on('input', (msg)=>{console.log(msg)})});
