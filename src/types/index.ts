export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  email: string;
  isOnline: boolean;
  lastSeen: any;
  createdAt: any;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: any;
}

export interface FriendShip {
  uid: string;
  status: 'pending' | 'accepted';
  createdAt: any;
  updatedAt: any;
}

export interface WorldMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  text: string;
  createdAt: any;
}

export interface CallSession {
  from: string;
  fromName: string;
  offer: any;
  type: 'audio' | 'video';
}

export interface CallLog {
  id: string;
  participants: string[];
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'missed' | 'completed' | 'rejected';
  duration?: number;
  createdAt: any;
}
