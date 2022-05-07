import 'dotenv/config'
import { mkdir, rmdir, rm, writeFile, open, FileHandle } from 'fs/promises'
import { existsSync, WriteStream } from 'fs';
import { PassThrough } from 'stream';
import { randomUUID } from 'crypto';

import express, { Express } from "express";

import Dockerode from 'dockerode'

//middlewares
import bodyParser from 'body-parser';
import cors from 'cors'
import { checkDTO } from './middlewares';
import { ExerciseDTO } from './dto';

import { DockerInfos } from './dockerInfo';

const app: Express = express();

const jsonparse = bodyParser.json()

const HOME_MOUNTS = "/tmp/runners"

const lang: string[][] = process.env.LANGUAGES.trim().split(" ").map((l: string): string[] => {
    return [l].concat(process.env[l.toUpperCase()].trim().split(",, "))
})


const IMAGES_MAP: Map<string, DockerInfos> = new Map<string, DockerInfos>(
    lang.map((l:string[]) => [l[0], new DockerInfos(l[0], l[1], l[2], l[3].slice(1, -1).split(", "), l[4].slice(1,-1).split(", "), l.slice(5))] ) as Iterable<readonly [string, DockerInfos]>
)

//app middlewares
app.use(cors())

app.post('/', jsonparse, checkDTO, async (req, res) => {
    const BODY: ExerciseDTO = req.body
    try {

        const docker = new Dockerode();
        const mountname = randomUUID()
        const containername = randomUUID()

        const INFO: DockerInfos = IMAGES_MAP.get(BODY.language.toLowerCase())

        //we will bind mount the container to /tmp/runners/[its_id_generated_by_UUID]
        if (!existsSync(HOME_MOUNTS))
            await mkdir(HOME_MOUNTS)
            
        await mkdir(`${HOME_MOUNTS}/${mountname}`)
        await writeFile(`${HOME_MOUNTS}/${mountname}/${INFO.filename}`, BODY.submitted)

        const container =  await docker.createContainer({
            name: containername,
            Image: INFO.image,
            Tty: false,
            Env: INFO.env,
            AttachStderr : true,
            AttachStdout: true,
            AttachStdin: true,
            WorkingDir: '/workdir',
            HostConfig: {
                Binds: [
                    `${HOME_MOUNTS}/${mountname}:/workdir`
                ]
            },
            Entrypoint: INFO.entrypoint,
            Cmd: INFO.cmd 
        })
       
        await container.start({})
        container.attach({stream: true, stdout: true, stderr: true}, async function (err, stream) {
            if (err) throw new Error("Error during atachment");

            let bufOut: string = ""
            let bufErr: string = ""
    
            let mystdout = new PassThrough()
            let mystderr = new PassThrough()


            // to split the stream into stderr and stdout
            container.modem.demuxStream(stream, mystdout, mystderr);

            stream.on("end", async ()=> {
                const COMPLETED: boolean = bufOut === BODY.expectedOutputs[0] // TODO prendre en compte si on a plusieurs exercices
                res.status(200).send({
                    completed: COMPLETED,
                    response: bufOut,
                    consoleerror: bufErr 
                })
            })

            mystdout.on("data", (chunk) => bufOut += chunk.toString())

            mystderr.on("data", (chunk) => bufErr += chunk.toString())

            mystdout.on('error', () => {
                res.status(500).send({
                    response: 'An error Happened during stdout reading'
                })
                throw new Error("Error when reading on stdout")
            })

            mystderr.on('error', () => {
                res.status(500).send({
                    response: 'An error Happened during stderr reading'
                })
                throw new Error("Error when reading on stderr")
            })
            await container.wait()
            await rm(`${HOME_MOUNTS}/${mountname}`, {recursive: true})
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
        IMAGES_MAP.forEach(i => PROMISES.push(docker.pull(i.image)))

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

