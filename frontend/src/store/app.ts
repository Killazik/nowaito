import { create } from 'zustand';

export type User = {
  id: string;
  phoneNumber: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isBlocked?: boolean;
  avatarUrl?: string | null;
  avatarType?: 'image' | 'video' | null;
  bannerUrl?: string | null;
  bannerType?: 'image' | 'video' | null;
};
export type Message = {
  id: string;
  chatId: string;
  text?: string | null;
  senderId: string;
  createdAt: string;
  pending?: boolean;
  sender?: User;
  media?: {
    id: string;
    type: 'photo' | 'video' | 'audio' | 'file';
    url: string;
    size?: string | number | null;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
  }[];
};
export type Chat = {
  id: string;
  type: string;
  title?: string;
  category?: string | null;
  avatarUrl?: string | null;
  participants?: { user: User }[];
  messages?: Message[];
};

type State = {
  user: User | null;
  chats: Chat[];
  messages: Message[];
  activeChatId: string | null;
  setUser: (u: User | null) => void;
  setChats: (c: Chat[]) => void;
  setMessages: (m: Message[]) => void;
  addMessage: (m: Message) => void;
  setActiveChat: (id: string) => void;
};

export const useAppStore = create<State>((set) => ({
  user: null,
  chats: [],
  messages: [],
  activeChatId: null,
  setUser: (user) => set({ user }),
  setChats: (chats) => set({ chats }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages.filter((m) => m.id !== message.id), message] })),
  setActiveChat: (activeChatId) => set({ activeChatId }),
}));

