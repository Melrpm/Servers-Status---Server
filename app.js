require('dotenv').config()
const os = require('os')
const express = require('express')
const nodemailer = require('nodemailer')
var cors = require('cors')
const port = process.env.SERVER_PORT
const app = express()
var ping = require('ping');
var wol = require('wake_on_lan');

app.use(cors({ origin: true }))
app.use(express.json())

app.listen(port, () => console.log(`Listening on port: ${port}`));
app.get('alive', async () => {
    return res.status(200).send('DONE')
})

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST_SMTP,
    name: process.env.EMAIL_NAME,
    secure: process.env.EMAIL_SECURE,
    port: process.env.EMAIL_PORT_SMPT,
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD
    }
})

let Servers = require('./server.json')

const sendEmail = async (server) => {
    let server_status = server.online ? 'Online' : 'Offine'
    try {
        let info = await transporter.sendMail({
            from: `"Server Status 👻" <${process.env.EMAIL_ADDRESS}>`, // sender address
            to: process.env.EMAIL_ADDRESS_RECEIVERS, // list of receivers
            subject: "Server Update", // Subject line
            html: `<div>Your server has gone ${server_status}.
            <br>
            <p>Server: ${server.label}</p>
            <p>IP: ${server.ip}</p>
            </div>`, // html body
        });

        console.log("Message sent: %s", info.messageId);

    } catch (err) {
        console.log(err)
    }
}

const sendEmailAllServer = async () => {
    try {
        let info = await transporter.sendMail({
            from: `"Server Status 👻" <${process.env.EMAIL_ADDRESS}>`, // sender address
            to: process.env.EMAIL_ADDRESS_RECEIVERS, // list of receivers
            subject: "Server Update", // Subject line
            html: `<div>This is a sample email.
            <br>
            <p>Your email address was setup successfully.</p>
            <p>In upcoming versions, this will send an email with all the servers status.</p>
            </div>`, // html body
        });

        console.log("Message sent: %s", info.messageId);

    } catch (err) {
        console.log(err)
    }
}

const io = require('socket.io')(process.env.SOCKET_IO_PORT, {
    cors: {
        origin: '*'
    }
})


app.get('/serverStatus', async (req, res) => {
    if (!req.query?.ip) {
        res.status(400).send(false)
    }

    const alive = await checkPing(req.query.ip)
    console.log(alive)
    io.emit('update-status', Servers)
    res.status(200).send(alive)
})


wol.wake('20:DE:20:DE:20:DE');

wol.wake('20:DE:20:DE:20:DE', function (error, res) {
    console.log(res)
    if (error) {
        console.log(error)
        // handle error
    } else {
        console.log("No error")
        // done sending packets
    }
})


app.post('/startServer', async (req, res) => {

    if (!req.query?.mac) {
        return res.status(400).send(false)
    }

    wol.wake(req.query.mac, function (error, res) {
        if (error) {
            console.log(error)
            // handle error
        } else {
            console.log("No error")
            // done sending packets
        }
    });
    
    return true
})


app.post('/sendEmailSample', async (req, res) => {

    try{
        sendEmailAllServer()
    }catch(err){
        console.log(err)
    }
    
    return true
})

io.on('connection', async socket => {

    console.log(socket.id)
    io.to(socket.id).emit('update-status', Servers)
    /*  io.emit('update-status', Servers) */
    /* io.emit('update-status', Servers) */
})

const checkPing = async (ip) => {
    let isAlive = false

    const pingPromise = new Promise((resolve, reject) => {
        ping.sys.probe(ip, function (isAlive) {
            resolve(isAlive)
        });
    })

    await pingPromise.then((result) => {
        return isAlive = result
    })

    return isAlive

}

const pingHandler = async (initial) => {
    for (let i = 0; i < Servers.length; i++) {
        ping.sys.probe(Servers[i].ip, function (isAlive) {
            Servers[i].lastCheck = new Date()
            if (!isAlive) {
                if (Servers[i].online) {
                    console.log(`${Servers[i].ip} - ${Servers[i].label}: Went down`);

                    Servers[i].online = false
                    Servers[i].lastUpdate = new Date()

                    io.emit('update-status', Servers)
                    if (!initial) {
                        sendEmail(Servers[i])
                    }
                }
            } else {
                if (!Servers[i].online) {
                    console.log(`${Servers[i].ip} - ${Servers[i].label}: Went up`);
                    Servers[i].online = true
                    Servers[i].lastUpdate = new Date()

                    io.emit('update-status', Servers)
                    if (!initial) {
                        sendEmail(Servers[i])
                    }
                }
            }
        });
    }
}
let initial = true
const interval = setInterval(function () {
    // method to be executed;
    pingHandler(initial)
    initial = false
}, 1000);


/* clearInterval(interval); */
