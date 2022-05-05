import 'dotenv/config'
import { mkdir, rmdir, rm, writeFile } from 'fs/promises'

import express, { Express } from "express";

import Dockerode from 'dockerode'

//middlewares
import bodyParser from 'body-parser';
import cors from 'cors'
import { checkDTO } from './middlewares/checkDTO';
import { randomUUID } from 'crypto';
import { ExerciseDTO } from './dto';
import { existsSync } from 'fs';

const app: Express = express();

const jsonparse = bodyParser.json()

const HOME_MOUNTS = "/tmp/runners"
const IMAGES_MAP = new Map<string, string> (
    process.env.IMAGES.trim().split("|||").map((e: string) => e.split(';')) as Iterable<readonly [string, string]>
)

//app middlewares
app.use(cors())

app.get('/', jsonparse, checkDTO, async (req, res) => {
    const BODY: ExerciseDTO = req.body
    try {
        //volume containing all necessary files such as the input, libraries, cragofiles etc
        const docker = new Dockerode();
        const mountname = randomUUID()
        const containername = randomUUID()

        // volume.
        await mkdir(`${HOME_MOUNTS}/${mountname}`)
        await writeFile(`${HOME_MOUNTS}/${mountname}/file`, BODY.submitted)
        
        
        const container =  await docker.createContainer({
            name: containername,
            Image: IMAGES_MAP.get(BODY.language.toLowerCase()),
            Tty: true,
            AttachStderr : true,
            AttachStdout: true,
            AttachStdin: true,
            WorkingDir: '/workdir',
            HostConfig: {
                Binds: [
                    `${HOME_MOUNTS}/${mountname}:/workdir`
                ]
            },
            Entrypoint: [],
            Cmd: ["/bin/echo", "'Hello!'"],
        })


        const stream: NodeJS.ReadWriteStream  = await container.attach({stream: true, stdout: true, stderr: true})
        stream.pipe(process.stdout)
        await container.start({})

    
        res.status(200).send({
            response: "res"
        })
    } catch(e) {
        res.status(500).send({
            message: "Could not handle request",
            error: e
        })
    }
}) 

app.listen(process.env.PORT || 80, async () => {
    if (!process.env.IMAGES) {
        console.log("Please fill environment variables")
        process.exit(1);
    }
    const docker = new Dockerode();
    console.log(IMAGES_MAP)

    try {
        const PROMISES: Promise<any>[] = []
        IMAGES_MAP.forEach(v => PROMISES.push(docker.pull(v)))

        console.log("Pulling images from dockerhub...")
        await Promise.all(PROMISES)
        console.log("Finished pulling!")

        console.log("Creating folder to hold container's mounting point")   
        if (!existsSync(HOME_MOUNTS))
            await mkdir(HOME_MOUNTS)

        console.log("Runner Ready to Go!")
    }
    catch (e) {
        console.log(e) 
        process.exit(1);
    }  
})

