require('dotenv').config();
import collect from 'collect.js';
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
beforeAll(async () => {
    dpm = new DrivePermissionManager(auth);
})
describe.skip('Category: getFiles()', () => {
    beforeAll(async () =>{
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

describe.skip('Category getPermissions(email)', () => {
    let permList: Permission[];
    beforeAll(async () => {
        permList = await dpm.getPermissions(process.env.TEST_USER_EMAIL);
    })
    test('Returns a defined value', async () => {
        expect(permList).toBeDefined();
    })
    test('Contains only permissions corresponding to a given email', () =>{
        let invalidEmailFound = false;
        for(const perm of permList){
            if(perm.emailAddress != process.env.TEST_USER_EMAIL){
                invalidEmailFound = true;
                break;
            }
        }
        expect(invalidEmailFound).toBeFalsy();
    })
})


describe.skip('Category getPermissions(fileId)', () => {
    let permList: Permission[];
    beforeAll(async () => {
        fileList = await dpm.getFiles();
        permList = await dpm.getPermissions(fileList[0].id);
    })
    test('Returns a defined value', async () => {
        expect(permList).toBeDefined();
    })
    test('Contains only permissions corresponding to a given fileId', () =>{
        let badPermissionFound = false;
        let expectedPerms = collect(permList);
        for(const perm of permList){
            if(!expectedPerms.contains(perm)){
                badPermissionFound = true;
                break;
            }
        }
        expect(badPermissionFound).toBeFalsy();
    })
})

describe('Category: addPermission()', () => {
    test('Adds a permission for a given email for a given fileId', async() => {
        try{
            expect(await dpm.addPermission('1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g', 'reader', 'user', 'jacksonmorton@u.boisestate.edu'))
            .resolves.toBeDefined();
        }
        catch(e){
            fail(e);
        }

    })
    test('Throws error when file not found in DB.', async () => {
        try{
           await dpm.addPermission('lorem_ipsum', 'reader', 'user', 'jacksonmorton@u.boisestate.edu')    
        }
        catch(e){
            expect(e).toMatch('File not found in database.');
        }
    })
    test('Rejects email strings that do not contain @ in them.', async () => {
        expect(await dpm.addPermission('1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g', 'reader', 'user', 'lorem_ipsum'))
        .rejects.toBe("Invalid email. Failed to find '@' character.");
    })
})