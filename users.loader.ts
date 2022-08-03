declare type IUsers = { [key: string]: { password: string, } };

import fs from 'fs';

const example =
{
    bananaacid: {
        password: 'test123',
    }
};

let users: IUsers;

let usersLoaded;

try {
    usersLoaded = fs.readFileSync('./config/users.json', { encoding: 'utf-8' });
}
catch (ex) {
    usersLoaded = null;
}

if (usersLoaded === null) {
    fs.writeFileSync('./config/users.json', JSON.stringify(example));
    users = example;
}
else {
    users = JSON.parse(usersLoaded);
}

export default users;