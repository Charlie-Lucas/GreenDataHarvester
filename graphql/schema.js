import { gql } from 'apollo-server-express';

const typeDefs = gql`
  type Query {
    ping: String
    
    # Sources de données
    sources: [Source!]!
    source(id: ID!): Source
    
    # Données INSEE SIRENE
    sireneData(query: SireneQueryInput): SireneResponse!
    sireneById(siret: String!): Etablissement
    
    # Données INSEE BDM
    bdmData(seriesId: String!, startDate: String, endDate: String): BdmResponse!
    bdmSeries: [BdmSeries!]!
    
    # Données locales INSEE
    donneesLocales(geoCode: String!, indicatorId: String!, year: Int): DonneesLocalesResponse!
    
    # Statistiques
    stats: Stats!
  }

  type Mutation {
    # Récolte de données
    harvestSource(sourceId: ID!, params: JSON): HarvestResult!
    harvestAll: [HarvestResult!]!
    
    # Gestion des données
    updateData(sourceId: ID!, query: JSON!, update: JSON!): UpdateResult!
    deleteData(sourceId: ID!, query: JSON!): DeleteResult!
  }

  type Source {
    id: ID!
    name: String!
    description: String
    type: String!
    connector: String!
    config: JSON
    persistence: PersistenceConfig
    schedule: ScheduleConfig
    transform: TransformConfig
  }

  type PersistenceConfig {
    strategy: String!
    collection: String!
    indexes: [IndexConfig!]
    ttl: TTLConfig
  }

  type IndexConfig {
    fields: JSON!
    unique: Boolean
    sparse: Boolean
  }

  type TTLConfig {
    enabled: Boolean!
    days: Int!
  }

  type ScheduleConfig {
    enabled: Boolean!
    cron: String!
    timezone: String!
  }

  type TransformConfig {
    enabled: Boolean!
    rules: [TransformRule!]!
  }

  type TransformRule {
    field: String!
    type: String!
    format: String
    mapping: JSON
  }

  # Types pour les données SIRENE
  type SireneResponse {
    header: SireneHeader!
    etablissements: [Etablissement!]!
    total: Int!
  }

  type SireneHeader {
    total: Int!
    debut: Int
    nombre: Int
  }

  type Etablissement {
    siret: String!
    siren: String!
    uniteLegale: UniteLegale!
    adresseEtablissement: AdresseEtablissement
    periodesEtablissement: [PeriodeEtablissement!]
  }

  type UniteLegale {
    siren: String!
    denominationUniteLegale: String
    denominationUsuelle1UniteLegale: String
    denominationUsuelle2UniteLegale: String
    denominationUsuelle3UniteLegale: String
    sigleUniteLegale: String
    dateCreationUniteLegale: String
    dateDernierTraitementUniteLegale: String
    categorieUniteLegale: String
    activitePrincipaleUniteLegale: String
    nomenclatureActivitePrincipaleUniteLegale: String
    trancheEffectifsUniteLegale: String
    effectifsUniteLegale: Int
    caractereEmployeurUniteLegale: String
    statutDiffusionUniteLegale: String
  }

  type AdresseEtablissement {
    numeroVoieEtablissement: String
    indiceRepetitionEtablissement: String
    typeVoieEtablissement: String
    libelleVoieEtablissement: String
    codePostalEtablissement: String
    libelleCommuneEtablissement: String
    libelleCommuneEtrangerEtablissement: String
    distributionSpecialeEtablissement: String
    codeCommuneEtablissement: String
    codeCedexEtablissement: String
    libelleCedexEtablissement: String
    codePaysEtrangerEtablissement: String
    libellePaysEtrangerEtablissement: String
  }

  type PeriodeEtablissement {
    dateFin: String
    dateDebut: String
    etatAdministratifEtablissement: String
    changementEtatAdministratifEtablissement: Boolean
    enseigne1Etablissement: String
    enseigne2Etablissement: String
    enseigne3Etablissement: String
    changementEnseigneEtablissement: Boolean
    denominationUsuelleEtablissement: String
    changementDenominationUsuelleEtablissement: Boolean
    activitePrincipaleEtablissement: String
    nomenclatureActivitePrincipaleEtablissement: String
    changementActivitePrincipaleEtablissement: Boolean
    caractereEmployeurEtablissement: String
    changementCaractereEmployeurEtablissement: Boolean
  }

  input SireneQueryInput {
    siret: String
    siren: String
    query: String
    limit: Int
    offset: Int
    dateCreationUniteLegale: String
    activitePrincipaleUniteLegale: String
    trancheEffectifsUniteLegale: String
  }

  # Types pour les données BDM
  type BdmResponse {
    seriesId: String!
    metadata: BdmMetadata!
    data: [BdmDataPoint!]!
  }

  type BdmMetadata {
    id: String!
    title: String!
    description: String
    unit: String
    frequency: String
    lastUpdate: String
  }

  type BdmDataPoint {
    date: String!
    value: Float!
    status: String
  }

  type BdmSeries {
    id: String!
    title: String!
    description: String
    unit: String
    frequency: String
    lastUpdate: String
  }

  # Types pour les données locales
  type DonneesLocalesResponse {
    geoCode: String!
    indicatorId: String!
    year: Int!
    data: [DonneesLocalesDataPoint!]!
  }

  type DonneesLocalesDataPoint {
    indicator: String!
    value: Float!
    unit: String
    status: String
  }

  # Types pour les résultats de récolte
  type HarvestResult {
    source: String!
    timestamp: String!
    dataCount: Int!
    success: Boolean!
    error: String
  }

  type UpdateResult {
    modifiedCount: Int!
    success: Boolean!
    error: String
  }

  type DeleteResult {
    deletedCount: Int!
    success: Boolean!
    error: String
  }

  # Types pour les statistiques
  type Stats {
    totalSources: Int!
    totalRecords: Int!
    lastHarvest: String
    sourcesStatus: [SourceStatus!]!
  }

  type SourceStatus {
    sourceId: ID!
    sourceName: String!
    lastHarvest: String
    recordCount: Int!
    status: String!
  }

  # Type JSON pour les données flexibles
  scalar JSON
`;

export default typeDefs;
