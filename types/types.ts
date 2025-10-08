import { Timestamp } from 'firebase/firestore';

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
  status: 'active' | 'adopted';
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IUser {
  id: string;
  name: string;
  username?: string; // YENİ: Username alanı eklendi
  email: string;
  bio?: string;
  phone?: string;
  location?: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface IConversation {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantPhotos: { [userId: string]: string };
  lastMessage: string;
  lastMessageTime: Timestamp;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
}

export interface IMessage {
  id: string;
  conversationId: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  read: boolean;
}