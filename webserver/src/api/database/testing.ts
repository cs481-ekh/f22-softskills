import { File } from '../drive-permission-manager/types';
import { Postgres } from './postgres';

const run = async () => {
    await p.files.create({
        id: "id",
        kind: "kind",
        name: "name",
        parents: [
            "parent1",
            "parent2"
        ],
        children: [
            "child1",
            "child2"
        ],
        owners: [
            "owner1",
            "owner2"
        ],
        permissions: [
        ]
    }, async (file: File) => {
        console.log("created:\n", file);
        await p.files.read("id", async (readFile: File, err: any) => {
            console.log("read:\n", readFile);
            readFile.name = "new name";
            await p.files.update(readFile, async (newFile: File) => {
                console.log("updated:\n", newFile);
                await p.files.delete(newFile.id, (lastFile: File) => {
                    console.log("deleted:\n", lastFile);
                    p.close();
                });
            });
        });
    });
}

const p: Postgres = new Postgres();
run();