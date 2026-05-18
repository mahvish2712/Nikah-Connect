export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  age: number;
  location: string;
  bio: string;
  profession: string;
  education: string;
  languages: string[];
  interests: string[];
  seeking: string;
  createdAt: any;
  updatedAt: any;
  isCompleted: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
  isRead: boolean;
}

export interface Match {
  id: string;
  userIds: string[]; // [uid1, uid2]
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}
