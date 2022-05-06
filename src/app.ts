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

app.get('/', jsonparse, checkDTO, async (req, res) => {
    const BODY: ExerciseDTO = req.body
    try {

        const docker = new Dockerode();
        const mountname = randomUUID()
        const containername = randomUUID()

        const INFO: DockerInfos = IMAGES_MAP.get(BODY.language.toLowerCase())

        //we will bind mount the container to /tmp/runners/[its_id_generated_by_UUID]
        await mkdir(`${HOME_MOUNTS}/${mountname}`)
        await writeFile(`${HOME_MOUNTS}/${mountname}/${INFO.filename}`, BODY.submitted)

        const container =  await docker.createContainer({
            name: containername,
            Image: INFO.image,
            Tty: true,
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

        let finalStr: string = ""

        const stream: NodeJS.ReadWriteStream = await container.attach({stream: true, stdout: true, stderr: true})
        stream.setEncoding('utf-8')        

        container.start({})

        stream.on("data", (chunk: string) => finalStr = finalStr.concat(chunk))

        stream.on('error', () => {
            res.status(500).send({
                response: 'An error Happened during stdout reading'
            })
        })

        stream.on("end", () => {
            res.status(200).send({
                response: finalStr
            })
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

