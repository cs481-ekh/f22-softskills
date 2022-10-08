import { Pool } from 'pg';
import { Files } from './data-types/files';
import { Users } from './data-types/users';
import { Permissions } from './data-types/permissions';

/**
 * Class to interact with all data types in the database
 */
 export class Postgres {
    private pool: Pool;
    users: Users;
    files: Files;
    permissions: Permissions;

    constructor() {
        this.pool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: Number(process.env.POSTGRES_PORT),
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DATABASE
        });
        this.users = new Users(this.pool);
        this.permissions = new Permissions(this.pool, this.users);
        this.files = new Files(this.pool, this.permissions);
    }

    /**
     * Initialize the tables for each data type if
     * it does not exist yet.
     */
    async initTables() {
        await this.users.initTable();
        await this.files.initTable();
        await this.permissions.initTable();
    }

    /**
     * Close the connections to the database
     */
    close() {
        this.pool.end();
    }
}
