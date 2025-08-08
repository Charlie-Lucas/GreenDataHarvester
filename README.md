# GreenDataHarvester
GreenDataHarvester is a project that aims to extract ecological and social data from a list of data sources. The first version will focus on French data, while the second version will expand to global data.

## Architecture
* **Server** – Express application exposing both REST and GraphQL endpoints.
* **Database** – MongoDB accessed through Mongoose.
* **Authentication** – Passport.js with a basic local strategy.
* **Front-end** – React application (see `/client`) consuming the GraphQL API.

## Features
* Minimal GraphQL API with a `ping` query.
* Sample user and profile routes.
* Passport-ready user model with password hashing.
* Docker environment for local development.

## Installation
```bash
docker-compose up --build
```
The server will run on `http://localhost:5000` and the front-end in `/client` can be started with `npm run dev`.

## Potential Data Domains
To enrich the dataset, consider integrating the following public French data sources:

| Domain | Source |
|-------|--------|
| Population statistics | [INSEE](https://www.insee.fr/)
| Parliamentary activity | [Assemblée Nationale votes](https://data.assemblee-nationale.fr/)
| Environmental data | [data.gouv.fr](https://www.data.gouv.fr/) – air quality, energy, waste
| Transportation | Open transport networks (SNCF, GTFS feeds)
| Health | Santé publique France datasets

Add new collectors under `src/sources/<domain>` following the existing INSEE and Assemblée examples.

## Contributing
1. Fork the repository
2. Create a branch `feature/your-feature-name` or `fix/your-fix-name`
3. Commit your changes
4. Open a Pull Request

## License
MIT

## Authors
- charlie-lucas as main author
- ChatGPT as contributor

## Disclaimer
This project is currently under development and should not be used in production environments without proper testing and modification.
