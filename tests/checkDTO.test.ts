import { checkDTO } from "../src/middlewares/checkDTO"
import { Response, Request, NextFunction } from "express"


describe("CheckDTO testing", () => {
    let mockResponse: Partial<any> //Partial<Request>
    mockResponse = {
        send: function(body: any){ },
        json: function(err: any){
            console.log("\n : " + err);
        },
        status: function(responseStatus: number) {
            // This next line makes it chainable
            return this; 
        }
    }

    
    
    it ('should accept the input', () => {
        let mockRequest = {
            method: 'POST',
            url: "http://localhost:4000/",
            body : {
                language: "PHP",
                inputs: ["Kill", "me"],
                expectedOutputs: ["Please", "do"],
                submitted: "console.log('help :c')"
            }
        } as Request

        const mockNext: NextFunction = jest.fn().mockImplementation()
        
        checkDTO(mockRequest, mockResponse as Response, mockNext)
        expect(mockNext).toHaveBeenCalled()
    })  

    it ('should not accept input', () => {
        let mockRequest = {
            method: 'POST',
            url: "http://localhost:4000/",
            body : {
                lang: "Lua",
                inputs: ["Kill", "me"],
                expectedOutputs: ["PLease", "do"],
                submitted: "console.log('help :c')"
            }
        } as Request

        const mockNext: NextFunction = jest.fn().mockImplementation()
        
        checkDTO(mockRequest, mockResponse as Response, mockNext)
        expect(mockNext).not.toHaveBeenCalled()
    })
})