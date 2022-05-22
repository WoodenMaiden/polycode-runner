# Polycode runner

- ⚠ You will need docker of a docker socket at your disposal to run this

## Run this app
```
npm run build
node ./dist/app.js
```

## Environment variables 
| Variable | Description | Required ?| 
| ---      | ---      | ---      |
| PORT | Port to run the app on | no (default: 80) |
| LANGUAGES | List of languages supported seperated by spaces. It must correspond to that the field "languages" could contain | yes |
| < INSERT_LANGUAGE_HERE_IN_UPPERCASE > | For each of the values in LANGUAGE create an environment variable in uppercase the format of the variable is explained below | yes |


## INSERT_LANGUAGE_HERE_IN_UPPERCASE format 
These variables will contain all informations about run containers, the format is the following: 

A_LANGUAGE=ame_of_image_with_no_tag,, filename,, [ENTRYPOINT, Array_form],, [CMD, Array_form],,  ENV=value,, ENV2=value ...
