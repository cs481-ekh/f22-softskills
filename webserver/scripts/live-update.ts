const axios = require('axios').default;

console.log("Script loaded!");

axios.get('/getFiles').then((res: any) => {
    console.log(res);
}).catch((err: any) => {
    console.error(err);
});