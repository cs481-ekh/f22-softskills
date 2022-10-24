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
let validPerm: Permission;

beforeAll(async () => {
    dpm = new DrivePermissionManager(auth);
    await dpm.initDb();
})
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////// getFiles()
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
describe('Category: getFiles()', () => {
    beforeAll(async () =>{
        fileList = await dpm.getFiles();
    })
    it('Spec 1 TC1: Returns a defined value', async () => {
        expect(fileList).toBeDefined();
    })
    it('Spec 1 TC2: Has length > 0', () => {
        expect(fileList.length).toBeGreaterThan(0);
    })
    it('Spec 1 TC3: Contains File objects', () => {
        expect(fileList[0].id).toBeDefined();
    })
    it('Spec 1 TC4: The File objects inside contain a Permission[]', () => {
        expect(fileList[0].permissions).toBeDefined();
    })
    it('Spec 1 TC5: The File objects inside contain a Permission[] of length > 0', () => {
        expect(fileList[0].permissions.length).toBeGreaterThan(0);
    })
})
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////// getPermissions(email)
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
describe.skip('Category: getPermissions(email)', () => {
    let permList: Permission[];
    beforeAll(async () => {
        permList = await dpm.getPermissions(process.env.TEST_USER_EMAIL);
    })
    test('Spec 1 TC1: Returns a defined value', async () => {
        expect(permList).toBeDefined();
    })
    test('Spec 1 TC2: Contains only permissions corresponding to a given email', () =>{
        expect(permList.find(perm => perm.user.emailAddress != process.env.TEST_USER_EMAIL)).toBeUndefined();
    })
})
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////// getPermissions(fileId)
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
describe('Category: getPermissions(fileId)', () => {
    let permList: Permission[];
    beforeAll(async () => {
        permList = await dpm.getPermissions(fileList[0].id);
    })
    test('Spec 1 TC1: Returns a defined value', async () => {
        expect(permList).toBeDefined();
    })
    test('Spec 1 TC2: Contains only permissions corresponding to a given fileId', () =>{
        expect(permList.find(perm => perm.fileId != fileList[0].id)).toBeUndefined();
    })
})
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////// addPermission()
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
describe('Category: addPermission()', () => {
    test('Spec 1 TC1: Adds a permission for a given email for a given fileId', async () => {
        try{
            let res = await dpm.addPermission('1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g', 'reader', 'user', 'jacksonmorton@u.boisestate.edu')
            if(res){
                validPerm = res;
            }
            let updatedPermList = await dpm.getPermissions('1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g');
            expect(updatedPermList.find(perm => perm.id == res.id)).toBeDefined();
        }
        catch(e){
            // fail(e);
            console.log(e);
        }
    })
    test('Spec 2 TC1: Throws error when file not found in DB.', async () => {
        try{
           await dpm.addPermission('lorem_ipsum', 'reader', 'user', 'jacksonmorton@u.boisestate.edu')    
        }
        catch(e){
            expect(e.reason).toMatch('File not found in database.');
        }
    })
    test('Spec 5 TC1: Rejects email strings that do not contain @ in them.', async () => {
        try{
            await dpm.addPermission('1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g', 'reader', 'user', 'lorem_ipsum')
        }
        catch(e){
            expect(e.reason).toBe("Invalid email format.");
        }
    })
})
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
////////// deletePermission()
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
describe('Category: deletePermission()', () => {
    test('Spec 1 TC1: Deletes a permission when given a valid fileId and associated permissionId', async() => {
        try{
            await dpm.deletePermission("1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g", validPerm.id);
            let updatedPermList = await dpm.getPermissions('1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g');
            expect(updatedPermList.find(perm => perm.id == validPerm.id)).toBeUndefined();
        }
        catch(e){
            console.log(e);
        }
    })
    test('Spec 3 TC1: Throws an error when given a valid fileId with a permissionId that does not exist.', async () => {
        try{
            await dpm.deletePermission("1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g", "123456789")
        }
        catch(e){
            expect(e).toEqual({
                fileId: '1YwSoa7_yrGz4_DviNPm_zrbUjn6SECSqMKJhjW-rj8g',
                permissionId:  "123456789",
                reason: "Permission not found.",
            });
        }
    })
    test('Spec 4 TC1: Throws an error when given an invalid fileId and a non-associated permissionId', async () =>{
        try{
            await dpm.deletePermission("123_seasame_street", "08121125420658720778");
        }
        catch(e){
            expect(e).toEqual({
                fileId: '123_seasame_street',
                permissionId:  "08121125420658720778",
                reason: "File not found.",
            });
        }
    })
    test('Spec 5 TC1: Throws an error when given an invalid fileId with a permissionId that does not exist', async () =>{
        try{
            await dpm.deletePermission("123_seasame_street", "123456789");
        }
        catch(e){
            expect(e).toEqual({
                fileId: '123_seasame_street',
                permissionId:  "123456789",
                reason: "File not found.",
            });
        }
    })
})