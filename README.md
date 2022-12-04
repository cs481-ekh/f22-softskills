# Drive Permission Manager

## Abstract:
Drive Permission Manager is a desktop docker application that allows the user to batch modify file permissions across multiple files in their Google Drive. When using Google Drive through the 
Google Drive website a user cannot batch remove or change file permissions, they can only add multiple users at one time with the same permission role. With Drive Permission Manager a user is able
to accomplish both of these things. Upon selecting a folder a user can view all permission holders for all files beneath it in the hierarchy.

The program works by pulling the drive contents from a service account into a database. From there the files are loaded into the website and displayed for the user. Here the user can navigate the file 
structure and view information such as owner and access holders. The file buttons have a checkbox that selects the file or files for batch permission modification with add or remove. Add can be used to 
update existing permissions, as it overwrites pre-existing permissions for a specified user.

The add permission workflow accepts a list of emails and a permission role. The permission role can be one of the following:  writer, commenter, reader. The remove permission workflow will display a list
of email addresses that correspond to the access holders for the current file selection. The user can select the emails they wish to remove from the file or files by clicking the checkbox next to the email.

Drive Permission Manager can be useful for a professionals involved with on-boarding new employees and need to provide access to sensitive information such as credentials or intellectual property. It can also be useful 
when an employee or employees are leaving an organization and need to have their access removed from said sensitive information within a large file hierarchy.

## Members:
- Isaac Bard
- Jackson Morton
- Phillip Bruce
- Ethan Frech

## What We Actually Built:
Drive Permission Manager uses a TypeScript back end, a PostgreSQL database, an Express middleware with oath2-passport authentication node server, and an EJS front end. The back end uses gaxios to interface with Google Drive's API. The front end uses the Google Drive API to authenticate the user and then uses the back end to pull the user's drive contents into the database. The front end then uses the database to display the user's drive contents. The front end also uses the back end to modify permissions on the user's drive files. The end result is the user is able to batch modify file permissions across multiple files and file hierarchies in their Google Drive/

[![Docker CI](https://github.com/cs481-ekh/f22-softskills/actions/workflows/docker-ci.yml/badge.svg)](https://github.com/cs481-ekh/f22-softskills/actions/workflows/docker-ci.yml)

