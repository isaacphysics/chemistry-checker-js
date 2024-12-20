# Chemistry Checker JS

Updated javascript version of the [old chemistry checker](https://github.com/isaacphysics/chemistry-checker).

# Running the server

Use `yarn dev` or `yarn start` to run the server locally on the port defined in `.env`.

The chemistry checker is available on `/chemistry` and the nuclear checker is available on `/nuclear`. Both have a parser on `./parse` and a checker on `./check`.

# Docker deployment

1. Ensure that [Docker](https://www.docker.com/) is installed
2. To build, run:
```
docker build -t ghcr.io/isaacphysics/chemistry-checker-js:latest --pull .
```
3. To deploy to the GitHub Container Registry, run:
```
docker push ghcr.io/isaacphysics/chemistry-checker-js:latest
```
