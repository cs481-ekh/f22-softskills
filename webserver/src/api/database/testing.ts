import { Postgres } from './postgres';

const run = async () => {
    await p.users.update({emailAddress: "person@example.com", displayName: "John Smith"}, user => {
        console.log(user);
        p.close();
    });
}

const p: Postgres = new Postgres();
run();