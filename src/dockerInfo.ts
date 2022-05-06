export class DockerInfos {
    language: string;
    image: string;
    filename: string;
    entrypoint: string[];
    cmd: string[];
    env: string[]

    constructor(language: string, image: string, filename: string,
        entrypoint: string[], cmd: string[], env: string[]) {
        this.language = language
        this.image = image
        this.filename = filename
        this.entrypoint = entrypoint
        this.cmd = cmd
        this.env = env
    }
}