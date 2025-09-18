export interface Realm {
  id: number;
  name: string;
  address: string;
  port: number;
}

export interface RealmWithPopulation extends Realm {
  population: number;
}
