export interface IListing {
  id: string;
  title: string;
  species: string;
  breed: string;
  age: string;
  gender: string;
  city: string;
  district: string;
  description: string;
  photos: string[];
  vaccinated: boolean;
  neutered: boolean;
  status: string;
  ownerId: string;
  createdAt: any;
  updatedAt?: any;
}

// ListingCard için basit versiyon
export interface IListingCard {
  id: string;
  title: string;
  species: string;
  age: string;
  city: string;
  photos?: string[];
  breed?: string;
  gender?: string;
  district?: string;
  description?: string;
  vaccinated?: boolean;
  neutered?: boolean;
  status?: string;
  ownerId?: string;
  createdAt?: any;
}