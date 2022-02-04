# Mist Rogue Monitor

## MIT LICENSE
 
Copyright (c) 2020 Thomas Munzer

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the  Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


## Features
This Web app can be used to keep historical data about the Rogue/Neighbor APs detected by Mist APs.

The backend will to a daily sync to retrieve the list of Rogue/Neighbor APs detected during the last day, and store the information. This can be used to have a better understanding to the Rogue/Neighbor APs on every sites, and to be alerted when an AP has been heard for more than X days.

- Multi-Org access
- Configuration menu to define the API Token, the list of sites to monitor, and the email alerting settings
- List Naighbor and Rogur (Lan, Spoof, Honeypot) APs
- Statitical information for the whole org
- Detailed view for each AP
- Historical data for each AP 


<img src="https://github.com/tmunzer/mist_rogue_monitor/raw/main/._readme/img/conf.jpg"  width="50%"  />
<img src="https://github.com/tmunzer/mist_rogue_monitor/raw/main/._readme/img/dash.jpg"  width="50%"  />
<img src="https://github.com/tmunzer/mist_rogue_monitor/raw/main/._readme/img/details.jpg"  width="50%"  />


## How it's working
* This application requires Mist accounts or API token to be used.
* This application is automatically retrieving the account information and access rights from the Mist Cloud.
* The administrator has to configure the App for each organisation (at least the API Token, list of sites to monitor and the synchronisation time).
* The app will perform a daily sync to retrieve the list of APs heard on each sites, and store it in the DB.
* The app will perform a daly check to get the list of APs heard for more than X days (the number of days can be configured by the admin). If some, and if email addresses are configured, the app will send an email with the list of identified APs.


## Installation

This is a demo application using the Mist APIs.

You can run it as a strandalone Python application, or deploy it as a Docker container.

**Note**: The application is not providing secured HTTPS connections. It is highly recommended to deploy it behind a reverse proxy providing HTTPS encryption.

### Standalone deployment

1. you must have [Node.js and npm](https://nodejs.dev/) installed on the server (tested with Node v16)
2. download the github repository
3. from the `src` folder, install the javascript dependencies (ex: `npm install`)
4. from the `src`folder, start the app with `npm start`
5. the app will connect to mongoDB and liston on port `TCP3000`

### Docker Image
The docker image is available on docker hub: https://hub.docker.com/repository/docker/tmunzer/mist_rogue_monitor.

The Docket image is listening on port `TCP3000`

## Configuration
You can configure the settings through a configuration file or through Environment Variables.

### Configuration File
A configuration example with explanation is avaiable in the `src/config_example.js`. This file must be edited and renamed `config.js`.

### Environment Variables
| Variable Name | Type | Default Value | Comment |
| ------------- | ---- | ------------- | ------- |
NODE_HOSTNAME | string | null | Server IP Address or FQDN |
NODE_PORT | int | 3000 | server HTTP port |
NODE_HTTPS | boolean | false | whether or not to enable HTTPS |
NODE_PORT_HTTPS | int | 3443 | if `NODE_HTTPS`==`true`, server HTTPS port |
NODE_HTTPS_CERT | string | null | if `NODE_HTTPS`==`true`, HTTPS certificate |
NODE_HTTPS_KEY | string | null | if `NODE_HTTPS`==`true`, HTTPS certifiate key |
NODE_DISABLE_SERVER_ROLE | boolean | false | because the syncing task may slow down the frontend processes, it may be recommanded to deploy one instance for serving the clients (`SERVER_ROLE`) and one instance to sync with Mist Cloud (`SYNC_ROLE`) |
NODE_DISABLE_SYNC_ROLE | boolean | false | because the syncing task may slow down the frontend processes, it may be recommanded to deploy one instance for serving the clients (`SERVER_ROLE`) and one instance to sync with Mist Cloud (`SYNC_ROLE`) |
MONGO_HOSTNAME | string | null | mongoDB server Hostname or IP address|
MONGO_DB | string | mrm | mongoDO collection name |
MONGO_USER | string | null | if authentication is required, mongoDB user |
MONGO_PASSWORD | string | null | if authentication is required, mongoDB password |
MONGO_ENC_KEY | string | null | to encrypt mongoDB data. Can be generated with `openssl rand -base64 32` |
MONGO_SIG_KEY | string | null | to encrypt mongoDB data. Can be generated with `openssl rand -base64 64` |
SMTP_HOSTNAME | string | null | IP Address or FQDN of the SMTP server to connect to |
SMTP_PORT | int | 25 | port to connect to the SMTP server |
SMTP_SECURE | boolean | false | to use STARTTLS connection with SMTP server |
SMTP_REJECT_UNAUTHORIZED | boolean | true | is `SMTP_SECURE`==`true`, do not authorized SMTP server with self signed certificate |
SMTP_USER | string | null | if SMTP requires authentication |
SMTP_PASSWORD | string | null | if SMTP requires authentication |
SMTP_FROM_NAME | string | Wi-Fi Access |  |
SMTP_FROM_EMAIL | string | wi-fi@corp.org | |
SMTP_SUBJECT | string | Your Personal Wi-Fi access code | |
SMTP_LOGO | string | https://cdn.mist.com/wp-content/uploads/logo.png | |
MAX_AGE | int | 30 | in days. how long the data are kept in the database. This is used to limit the rogue details history, and to automatically delete an AP if it has not been heard for more than X days |

