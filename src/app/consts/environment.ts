// Development defaults. Production build swaps this for environment.prod.ts
// via the fileReplacements entry in angular.json.
export const environment = {
    production: false,
    name: "Dev",
    apiURL : "http://localhost:8080",
    wsURL : "http://localhost:8080/ws"
}