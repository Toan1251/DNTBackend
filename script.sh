#!/bin/bash

docker network create mongonetwork

docker run -d -p 30001:27017 --name mongodb1 --net mongonetwork mongo:latest --replSet repl

docker run -d -p 30002:27017 --name mongodb2 --net mongonetwork mongo:latest --replSet repl

docker run -d -p 30003:27017 --name mongodb3 --net mongonetwork mongo:latest --replSet repl

docker exec -it mongodb1 mongosh  --eval "rs.initiate({_id: 'repl', members: [{_id: 0, host: '172.23.113.237:30001'}, {_id: 1, host: '172.23.113.237:30002'}, {_id: 2, host: '172.23.113.237:30003'}]})"