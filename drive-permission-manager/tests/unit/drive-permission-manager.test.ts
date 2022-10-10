require('dotenv').config();
import DrivePermissionManager from '../../src'
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import {File, GranteeType, Permission, User, Role} from '../../src';
import {drive_v3, google} from 'googleapis';
import { file } from 'googleapis/build/src/apis/file';
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.CREDS_PATH,
    scopes: SCOPES
});
let dpm: DrivePermissionManager;
let fileList: File[];
describe('Category: getFiles()', () => {
    beforeAll(async () =>{
        dpm = new DrivePermissionManager(auth);
        // await dpm.initDb();
        fileList = await dpm.getFiles();
    })
    it('Returns a defined value', async () => {
        expect(fileList).toBeDefined();
    })
    it('Has length > 0', () => {
        expect(fileList.length).toBeGreaterThan(0);
    })
    it('Contains File objects', () => {
        expect(fileList[0].id).toBeDefined();
    })
    it('The File objects inside contain a Permission[]', () => {
        expect(fileList[0].permissions).toBeDefined();
    })
    it('The File objects inside contain a Permission[] of length > 0', () => {
        expect(fileList[0].permissions.length).toBeGreaterThan(0);
    })
})
