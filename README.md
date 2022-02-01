# RidenStat
Turning the Riden 60XX into something a little more useful

This is a node webserver that coordinates control/reading of from a riden power supply controller along with a arduino tied to an INA 219 for (much) faster and more percise potential/current/power reads. It exposes a basic web interface with minimal plotting and logging functions, and these controls can be called via `post` calls from your favorite scripting engine (e.g. python). Because the node code controls the riden and the logging, all the scripting needs to do is handle the send commands and start/stop the logging.  

## Install

`npm i`

## Usage

`node server.js --dird=log_file_directory`  


Hardcoded to port 3000. 

## Endpoints 

- `/logging (POST)`
  - expects a `JSON` payload in the format `{'logfile':'[log_file_name]'}`
    - on the backend _two_ files will be generated, one logging the RIDEN ~1/s(`log_file_name_status.csv`) and one logging the INA219 (`log_file_name_data.csv`) ~500/s.
    - set `log_file_name` to `undefined` (no quotes) to stop the log

- `/set_voltage (POST)`
  - expects a `JSON` payload in the format `{'voltage':[float voltage]]}`
  - since this is a power supply it operaes at whatever the higher limiting variable is 

- `/set_current (POST)`
  - expects a `JSON` payload in the format `{'current':[float current]]}`
  - since this is a power supply it operaes at whatever the higher limiting variable is 

- `/enable (POST)`
  - enable the power supply 

- `/disable (POST)`
  - disable the power supply 

- The processed values from the RIDEN and the INA219 can be read in realtime with a `socket.io` connection to
  - `data` for the INA219
  - `status` for the RIDEN

see `index.html` for an implemtation example of all the above.