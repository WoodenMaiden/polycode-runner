import { Response, Request, NextFunction } from "express";
import { DTO, ExerciseDTO } from '../dto'


const DTOs: Map<string, DTO> = new Map<string, DTO>([
    ["GET;", new ExerciseDTO()]
])


export function checkDTO(req: Request, res: Response, next: NextFunction) {
    const REGEX = /"\w+":/ig

    const input = req.body
    const identifiedDTO: DTO = DTOs.get(req.method + ";" + req.url.substring(1)) ?? res.status(400).send({
        message: "Invalid route"
    })

    const DTOFields: string[] = JSON.stringify(identifiedDTO).match(REGEX);
    const strInputFields: string[] = JSON.stringify(input).match(REGEX);

    const compareArr: string[] = DTOFields.filter(entry => !strInputFields.includes(entry));
    if (compareArr.length === 0) next()
    else {
        res.status(400).send({
            message: "Invalid body"
        })
    }
}