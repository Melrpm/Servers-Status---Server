require('dotenv').config()
const express = require('express')
const nodemailer = require('nodemailer')
var ping = require ("net-ping");
const port = process.env.SERVER_PORT

const app = express()
app.listen(port, () => console.log(`Listening on port: ${port}`));

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST_SMTP,
    name: process.env.EMAIL_NAME,
    secure: true,
    port: 465,
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
})

const sendEmail = async (server) =>{
    let server_status = server.online ? 'Online' : 'Offine'
    let info = await transporter.sendMail({
        from: `"Server Status 👻" <${process.env.EMAIL_NAME}`, // sender address
        to: process.env.EMAIL_ADDRESS_RECEIVERS, // list of receivers
        subject: "Server Update", // Subject line
        html: `<div>Your server has gone ${server_status}.
        <br>
        <p>Server: ${server.label}</p>
        <p>IP: ${server.ip}</p>
        </div>`, // html body
      });

      console.log("Message sent: %s", info.messageId);
}
 console.log(process.env.SOCKET_IO_PORT)
const io = require('socket.io')(process.env.SOCKET_IO_PORT, {
    cors:{
        origin:'*'
    }
})

let Servers = [
    {
        label: 'US1',
        ip:'127.0.0.1',
        online: true,
        lastUpdate: new Date()
    },
    {
        label: 'US2',
        ip:'22.0.0.231',
        online: false,
        lastUpdate: new Date()
    },
    {
        label: 'US3',
        ip:'2s2.0.0.231',
        online: false,
        lastUpdate: new Date()
    },
    {
        label: 'US1',
        ip:'127.0.0.1',
        online: true,
        lastUpdate: new Date()
    },
    {
        label: 'US1',
        ip:'123123.0.0.1',
        online: false,
        lastUpdate: new Date()
    },
    {
        label: 'US1',
        ip:'127.0.0.1',
        online: true,
        lastUpdate: new Date()
    },
]

io.on('connection', async socket =>{
    console.log(socket.id)
    io.to(socket.id).emit('update-status', Servers)
   /*  io.emit('update-status', Servers) */
    /* io.emit('update-status', Servers) */
})


const pingHandler = async (initial) => {
  var session = ping.createSession();  

  for (let i = 0; i < Servers.length; i++){
      session.pingHost (Servers[i].ip, function (error, target) {
        if (error){
            if(Servers[i].online){
                console.log(Servers[i].ip + Servers[i].label + ": Went Down")
                Servers[i].online = false
                Servers[i].lastUpdate = new Date()

                io.emit('update-status', Servers)
                if (!initial){
                    sendEmail(Servers[i])
                }
            }
        } else {
            if(!Servers[i].online){
                console.log(Servers[i].ip + Servers[i].label + ": Went Up")
                Servers[i].online = true
                Servers[i].lastUpdate = new Date()

                io.emit('update-status', Servers)
                if (!initial){
                    sendEmail(Servers[i])
                }
            }
        }
      });
  }
}
let initial = true
const interval = setInterval(function() {
    // method to be executed;
    pingHandler(initial)
    initial = false
}, 1000);


/* clearInterval(interval); */
