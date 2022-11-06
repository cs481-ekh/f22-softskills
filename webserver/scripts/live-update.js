function getFiles() {
    axios.get('/getFiles', {
        params: {
            fileIds: [
                files[0].id,
                files[1].id
            ]
        }
    }).then(res => {
        console.log(res);
    }).catch(err => {
        console.error(err);
    });
}

async function getGrandchildren(fileId) {
    const file = files.find(f => f.id == fileId);
    if (!file || !file.children || file.children.length == 0)
        return Promise.resolve([]);
    let grandchildren = [];
    file.children.forEach(childId => {
        let child = files.find(f => f.id == childId);
        if (child.children)
            grandchildren = grandchildren.concat(child.children);
    });
    for (let i = 0; i < grandchildren.length; i++)
        if (files.some(f => f.id == grandchildren[i]))
            grandchildren.splice(i--, 1);
    if (!grandchildren || grandchildren.length == 0)
        return [];
    const res = await axios.get('/getFiles', {
        params: {
            fileIds: grandchildren
        }
    });
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve([]);
}

async function testFiles() {
    const params = {
        fileIds: [
            "1NVaiPgW70cvOOHu7dQWlpYC9y_upuKqqfa3LHi1YVN4",
            "1GRX6cTr0LeWCPh9RRCVIZjoWtAhOL8lwQqeXWqm_EZg"
        ],
        role: "reader",
        granteeType: "user",
        emails: [
            "pb4000231@gmail.com"
        ]
    };
    const res = await axios.post('/addPermissions', params);
    console.log("res", res);
    console.log("res.data", res.data);
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve(res);
}

async function testFolder() {
    const params = {
        fileIds: [
            "1MqXS-fkiU1rFkkQhOSlHqWiL5KIlBqOA"
        ],
        role: "reader",
        granteeType: "user",
        emails: [
            "pb4000231@gmail.com"
        ]
    };
    const res = await axios.post('/addPermissions', params);
    console.log("res", res);
    console.log("res.data", res.data);
    if (res)
        return Promise.resolve(res.data);
    return Promise.resolve(res);
}