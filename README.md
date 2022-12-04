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

# **Getting Started**

# Things You'll Need
- [A Google Account](https://cloud.google.com/apis/docs/getting-started#creating_a_google_account)
- [A Google Project](https://cloud.google.com/apis/docs/getting-started#creating_a_google_project)
- [Google Drive API Enabled In Your Project](https://cloud.google.com/apis/docs/getting-started#enabling_apis)
- [Docker](https://docs.docker.com/get-docker/)
- [Access Credentials For Your Google Project](https://cloud.google.com/apis/docs/getting-started#getting_application_credentials)

# Installing And Running

 ### **Step 1: Create .env file in /webserver**
 Create a .env file inside of the webserver directory with the env_template file provided.

 The only fields you need to modify are the following:

    GOOGLE_CLIENT_ID=<your google project client id here>
    GOOGLE_CLIENT_SECRET=<your google project client secret here>
    GOOGLE_API_KEY=<your google project api key here>
    GDRIVE_EMAIL=<drive email address here>

**Important Note:** The GDRIVE_EMAIL field is what the application will use later to initialize the database. Whatever drive data you want to use in this application must be accessible by that account address.

---
### **Step 2. Build The Docker Images**
Run the build.sh script to build the docker images for the webserver and database.

    $ ./build.sh
---
### **Step 3. Create And Run Docker Containers**
Run the run.sh script to create and start the docker containers for the webserver and database.

    $ ./run.sh

---
### **Step 4. Navigate To Application In Your Web Browser**

View the application in the browser at address localhost:3000/

---

### **Step 5. Login To Application To Initialize Database**

Login to the application with the account matching the GDRIVE_EMAIL value you specified in the .env file from Step 1.


**Note:** This can take a long time so go grab a cup of your favorite warm beverage while it does its thing :)

---

### **Step 6. Using The Application**
 The application will eventually load the root contents of your Google Drive and you will be able to use
the application. Be warned that some of the operations can take a while so use the application carefully and responsibily.

---

## **Cleaning Up**
 When you are finishing running the application run the clean.sh script:

    $ ./clean.sh

# **Debugging / Potential Pitfalls**
* **Shared Drives:** During development we tested our functionality using an account with only a My Drive. The usability of this project with a shared drive or drives isn't something that was tested. It may work, it may not.

* **Speed:**  This application is slow and very slow for large drives. At the time of creation, it doesn't seem like Google has a batch request option for a project like ours and thus calls to the server for adding or removing permissions from a file can take a while depending on the amount of work needed.

* **Persistence:**  Do not keep this application running after you are done using it. It currently does not have a way to stay in sync with changes that happen to a user's Google Drive outside of this application. Use it for short periods of time only.
