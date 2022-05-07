import { DTO } from "./dto"

class ExerciseDTO extends DTO {
    language: string = ""
    inputs: string[] = [""]
    expectedOutputs: string[] = [""]

    submitted: string = ""
}

export { ExerciseDTO }