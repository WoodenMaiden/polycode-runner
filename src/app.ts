import 'dotenv/config'
import { connect } from 'mongoose';
import express, { Express } from "express";

import Dockerode from 'dockerode'

//middlewares
import bodyParser from 'body-parser';
import cors from 'cors'

const app: Express = express();

const jsonparse = bodyParser.json()

app.get('/:exercice', () => {
    
}) 

//app middlewares
app.use(cors())

app.listen(process.env.PORT || 80, async () => {
    if (!process.env.MONGODB_URI) {
        console.log("Please fill environment variables")
        process.exit(1);
    }

    const docker = new Dockerode()

    try {
        await connect(process.env.MONGODB_URI)
        await docker.pull("ubuntu")
        console.log("Launched")
        await docker.run("ubuntu", ["/usr/bin/echo", "-e", "'Hello World!'"], process.stdout, {Tty: true})
    }
    catch (e) {
        console.log(e) 
        process.exit(1);
    }  
})

