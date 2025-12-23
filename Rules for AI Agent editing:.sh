Rules for AI Agent editing:

# DB
DB is local psql
DB_TYPE=local
DB_USER=radiouser
DB_PASSWORD=radio123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=radiodb

# Services
We use 'pm2 restart all' for services restart

the website has 3 different URLs:
http://192.168.10.121/ - internal network ip
http://212.179.162.102:8080/ - external internet ip
http://l.103.fm:8080/ - external internet url 
