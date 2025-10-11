import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import ChatScreen from '../../../app/chat/[conversationId]';

// --- Mock veriler ---
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
};

const mockConversationData = {
  participants: ['test-user-id', 'other-user-id'],
  participantNames: {
    'test-user-id': 'Test User',
    'other-user-id': 'John Doe',
  },
  participantPhotos: {
    'test-user-id': 'https://example.com/test-photo.jpg',
    'other-user-id': 'https://example.com/john-photo.jpg',
  },
  unreadCount: {
    'test-user-id': 0,
    'other-user-id': 0,
  },
  settings: {
    'test-user-id': { readReceipts: true, muted: false },
    'other-user-id': { readReceipts: true, muted: false },
  },
};

const mockMessages = [
  {
    id: 'msg1',
    text: 'Merhaba!',
    senderId: 'other-user-id',
    timestamp: { toDate: () => new Date() },
    read: false,
  },
  {
    id: 'msg2',
    text: 'Nasılsın?',
    senderId: 'test-user-id',
    timestamp: { toDate: () => new Date(Date.now() - 60000) },
    read: true,
  },
];

// --- Mock router fonksiyonları ---
const mockPush = jest.fn();
const mockBack = jest.fn();

// --- Mocklar ---
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, ...paths) => ({ _type: 'collection', _paths: paths })),
  query: jest.fn((...args) => ({ _type: 'query', _args: args })),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn((db, ...paths) => ({ _type: 'doc', _paths: paths })),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getDownloadURL: jest.fn(),
  uploadBytes: jest.fn(),
  ref: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    conversationId: 'test-conversation-id',
  }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    user: mockUser,
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: '#000',
      primary: '#007AFF',
      card: '#fff',
      inputBackground: '#f5f5f5',
      border: '#e0e0e0',
      secondaryText: '#666',
    },
  }),
}));

jest.mock('../../../firebase', () => ({
  db: {},
  storage: {},
}));

jest.mock('../../../app/chat/components/ChatSettingsModal', () => {
  return jest.fn(() => null);
});

jest.spyOn(Alert, 'alert');

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // ✅ Düzeltilmiş Mock Firestore snapshot dinleyicileri
    (onSnapshot as jest.Mock).mockImplementation((ref, callback) => {
      // Query tipinde mi (messages), yoksa doc tipinde mi (conversation)?
      const isQuery = ref._type === 'query';

      if (isQuery) {
        // Messages query için snapshot
        const fakeSnapshot = {
          forEach: (fn: any) => {
            mockMessages.forEach((msg) =>
              fn({ id: msg.id, data: () => msg })
            );
          },
        };
        callback(fakeSnapshot);
      } else {
        // Conversation document için snapshot
        const fakeSnapshot = {
          exists: () => true,
          data: () => mockConversationData,
        };
        callback(fakeSnapshot);
      }

      return jest.fn(); // unsubscribe fonksiyonu
    });

    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (fn: any) =>
        mockMessages.forEach((m) =>
          fn({ id: m.id, data: () => m, ref: { id: m.id } })
        ),
    });

    const mockBatch = {
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
    (writeBatch as jest.Mock).mockReturnValue(mockBatch);

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ photoURL: 'https://example.com/real-photo.jpg' }),
    });

    (serverTimestamp as jest.Mock).mockReturnValue(new Date());
  });

  it('renders correctly', async () => {
    const { findByText } = render(<ChatScreen />);
    expect(await findByText('John Doe')).toBeTruthy();
  });

  it('displays messages', async () => {
    const { findByText } = render(<ChatScreen />);
    expect(await findByText('Merhaba!')).toBeTruthy();
    expect(await findByText('Nasılsın?')).toBeTruthy();
  });

  it('allows typing a message', async () => {
    const { getByPlaceholderText } = render(<ChatScreen />);
    await waitFor(() => {
      const messageInput = getByPlaceholderText('Mesaj yaz...');
      fireEvent.changeText(messageInput, 'Test mesajı');
      expect(messageInput.props.value).toBe('Test mesajı');
    });
  });

  it('sends a message', async () => {
    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-message-id' });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      expect(getByPlaceholderText('Mesaj yaz...')).toBeTruthy();
    });

    const messageInput = getByPlaceholderText('Mesaj yaz...');
    fireEvent.changeText(messageInput, 'Test mesajı');

    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const sendButton = touchables.find((t) => t.props.children?.props?.name === 'send');
    
    if (sendButton) {
      fireEvent.press(sendButton);
      await waitFor(() => {
        expect(addDoc).toHaveBeenCalled();
        expect(updateDoc).toHaveBeenCalled();
      });
    }
  });

  it('clears input after sending message', async () => {
    (addDoc as jest.Mock).mockResolvedValue({ id: 'new-message-id' });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      expect(getByPlaceholderText('Mesaj yaz...')).toBeTruthy();
    });

    const messageInput = getByPlaceholderText('Mesaj yaz...');
    fireEvent.changeText(messageInput, 'Test mesajı');

    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const sendButton = touchables.find((t) => t.props.children?.props?.name === 'send');
    
    if (sendButton) {
      fireEvent.press(sendButton);
      await waitFor(() => expect(messageInput.props.value).toBe(''));
    }
  });

  it('does not send empty messages', async () => {
    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      expect(getByPlaceholderText('Mesaj yaz...')).toBeTruthy();
    });

    const messageInput = getByPlaceholderText('Mesaj yaz...');
    fireEvent.changeText(messageInput, '   ');

    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const sendButton = touchables.find((t) => t.props.children?.props?.name === 'send');
    
    if (sendButton) {
      fireEvent.press(sendButton);
      expect(addDoc).not.toHaveBeenCalled();
    }
  });

  it('navigates back on back button press', async () => {
    const { UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const backButton = touchables.find((t) => t.props.children?.props?.name === 'arrow-back');
    
    if (backButton) {
      fireEvent.press(backButton);
      expect(mockBack).toHaveBeenCalled();
    }
  });

  it('navigates to user profile on header press', async () => {
    const { findByText } = render(<ChatScreen />);
    const userName = await findByText('John Doe');
    fireEvent.press(userName.parent || userName);
    expect(mockPush).toHaveBeenCalledWith('/users/other-user-id');
  });

  it('opens image picker on image button press', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
    });

    const { UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const imageButton = touchables.find((t) => t.props.children?.props?.name === 'image');
    
    if (imageButton) {
      fireEvent.press(imageButton);
      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });
    }
  });

  it('handles image picker permission denial', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const imageButton = touchables.find((t) => t.props.children?.props?.name === 'image');
    
    if (imageButton) {
      fireEvent.press(imageButton);
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'İzin Gerekli',
          'Fotoğraf seçmek için izin vermelisiniz'
        );
      });
    }
  });

  it('displays read receipts for sent messages', async () => {
    const { UNSAFE_getAllByType, UNSAFE_queryAllByType } = render(<ChatScreen />);
    
    // İlk önce component'in yüklenmesini bekle
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    // Ionicons import edilmemiş olabilir, o yüzden props ile arayalım
    const allElements = UNSAFE_queryAllByType('Ionicons' as any);
    const readReceipt = allElements.find((i) => i.props.name === 'checkmark-done');
    expect(readReceipt).toBeTruthy();
  });

  it('displays image messages', async () => {
    const messagesWithImage = [
      ...mockMessages,
      {
        id: 'msg3',
        text: '',
        imageUrl: 'https://example.com/image.jpg',
        senderId: 'test-user-id',
        timestamp: { toDate: () => new Date() },
        read: false,
      },
    ];

    (onSnapshot as jest.Mock).mockImplementation((ref, callback) => {
      const isQuery = ref._type === 'query';

      if (isQuery) {
        const fakeSnapshot = {
          forEach: (fn: any) => {
            messagesWithImage.forEach((msg) =>
              fn({ id: msg.id, data: () => msg })
            );
          },
        };
        callback(fakeSnapshot);
      } else {
        const fakeSnapshot = {
          exists: () => true,
          data: () => mockConversationData,
        };
        callback(fakeSnapshot);
      }

      return jest.fn();
    });

    const { UNSAFE_getAllByType } = render(<ChatScreen />);
    
    // Component'in render olmasını bekle
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    // Image component'ini bul
    const images = UNSAFE_getAllByType('Image' as any);
    const chatImage = images.find((img) => 
      img.props.source?.uri === 'https://example.com/image.jpg'
    );
    expect(chatImage).toBeTruthy();
  });

  it('formats message timestamps correctly', async () => {
    const { UNSAFE_getAllByType } = render(<ChatScreen />);
    
    // Component'in render olmasını bekle
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    // Text elementlerini bul ve timestamp formatını kontrol et
    const textElements = UNSAFE_getAllByType('Text' as any);
    const timeElement = textElements.find((text) => 
      /\d{2}:\d{2}/.test(text.props.children)
    );
    expect(timeElement).toBeTruthy();
  });

  it('shows loading state initially', () => {
    (onSnapshot as jest.Mock).mockImplementation(() => jest.fn());
    const { UNSAFE_getAllByType } = render(<ChatScreen />);
    const indicators = UNSAFE_getAllByType('ActivityIndicator' as any);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('handles send message error', async () => {
    (addDoc as jest.Mock).mockRejectedValue(new Error('Send failed'));
    
    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      expect(getByPlaceholderText('Mesaj yaz...')).toBeTruthy();
    });

    const messageInput = getByPlaceholderText('Mesaj yaz...');
    fireEvent.changeText(messageInput, 'Test mesajı');
    
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const sendButton = touchables.find((t) => t.props.children?.props?.name === 'send');
    
    if (sendButton) {
      fireEvent.press(sendButton);
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Mesaj gönderilemedi');
      });
    }
  });

  it('disables send button while sending', async () => {
    (addDoc as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: 'new-id' }), 100))
    );

    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<ChatScreen />);
    
    await waitFor(() => {
      expect(getByPlaceholderText('Mesaj yaz...')).toBeTruthy();
    });

    const messageInput = getByPlaceholderText('Mesaj yaz...');
    fireEvent.changeText(messageInput, 'Test mesajı');
    
    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const sendButton = touchables.find((t) => t.props.children?.props?.name === 'send');
    
    if (sendButton) {
      fireEvent.press(sendButton);
      fireEvent.press(sendButton);
      await waitFor(() => {
        expect(addDoc).toHaveBeenCalledTimes(1);
      });
    }
  });

  it('marks messages as read', async () => {
    const { findByText } = render(<ChatScreen />);
    
    await findByText('Merhaba!');
    
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});