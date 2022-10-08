import { File, Permission } from '../drive-permission-manager/src/types';
import { Postgres } from './postgres';

const run = async () => {
    // await p.files.create({
    //     id: "id",
    //     kind: "kind",
    //     name: "name",
    //     parents: [
    //         "parent1",
    //         "parent2"
    //     ],
    //     children: [
    //         "child1",
    //         "child2"
    //     ],
    //     owners: [
    //         "owner1",
    //         "owner2"
    //     ],
    //     permissions: [
    //     ]
    // }, async (file: File) => {
    //     console.log("created:\n", file);
    //     await p.files.read("id", async (readFile: File) => {
    //         console.log("read:\n", readFile);
    //         readFile.name = "new name";
    //         await p.files.update(readFile, async (newFile: File) => {
    //             console.log("updated:\n", newFile);
    //             await p.files.delete(newFile.id, (lastFile: File) => {
    //                 console.log("deleted:\n", lastFile);
    //                 p.close();
    //             });
    //         });
    //     });
    // });
    p.close();
    await p.permissions.create({
        id: "id",
        emailAddress: "email",
        type: "type",
        role: "role",
        expirationDate: "date",
        deleted: false,
        pendingOwner: false,
        user: {
            displayName: "John",
            emailAddress: "johncena@email.com"
        }
    }, async (c: Permission) => {
        console.log("created", c);
        await p.permissions.read(c.id, async (r: Permission) => {
            console.log("read", r);
            r.deleted = true;
            await p.permissions.update(r, async (u: Permission) => {
                console.log("update", u);
                await p.permissions.delete(u.id, (d: Permission) => {
                    console.log("delete", d);
                    p.close();
                });
            });
        });
    });
}

const p: Postgres = new Postgres();
run();