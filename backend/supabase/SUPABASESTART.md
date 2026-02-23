# Comprehensive guide for setting up and testing connection to remote database locally

# 1. INSTALL DOCKER DESKTOP!!!
As much as we all are not confident with using docker, it is necessary for the development of our project as a team, plus we can all benefit from learning and understanding how it works. I have included the docker-compose.yml file for setting up our remote database to be connected to our projects on our local machines. 
### Note that this file was a template and include the necessary defaults to get it working. 

# 2. Installed Supabase folder in backend directory
## This creates the necessary file structure 
backend/
├── .branches/
├── .temp/
├── migrations/         <- IMPORTANT, it is the remote db
├── snippets/           <-  
├── .gitignore          <- self explanatory
├── config.toml         <- IMPORTANT, Modified small sections in here to include addtional_redirect_url of localhost:5173
└── SUPABASESTART.md    <- this file lol


# 3. Commands to run, if everything before works as it should, especially docker
### This list of commands is based on Supabase CLI Documentation and researching online with Docker containers. I have added commands in the scripts section of the `backend/package.json` for easier use.
For now, do this:

| Scenario | Command |
|----------|---------|
| **First time after pull**             | `./setup.sh`  for Mac/Linux or `setup.bat` for Windows|
| **Start local environment**           | `npm run db:local` |
| **Serve edge functions**              | `npm run functions:serve` |   <- not needed unless you are creating functions
| **Stop services and docker compose**  | `npm run db:stop` |

**You should NOT be asked for passwords or authentication** because Docker handles it automatically through the credentials stored in `~/.supabase/` after linking once already.

# 4. Testing your connection to remote database, after starting local environment
Run `node test-connection.js` in the terminal to check if it works. You should get a `SUCCESSFULLY CONNECTED TO REMOTE DB PROJECT!` message and a simple query should be returned. Check the information of the query, it should look familiar. 
