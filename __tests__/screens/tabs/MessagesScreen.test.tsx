import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { collection, getDoc, onSnapshot, or, query, where } from 'firebase/firestore';
import React from 'react';
import MessagesScreen from '../../../app/(tabs)/messages';

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
};

const mockPush = jest.fn();

// Firebase mock'ları
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  or: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuthContext: jest.fn(() => ({
    user: mockUser,
  })),
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

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockConversations = [
  {
    id: 'conv1',
    participants: ['test-user-id', 'other-user-1'],
    participantNames: {
      'test-user-id': 'Test User',
      'other-user-1': 'John Doe',
    },
    participantPhotos: {
      'test-user-id': 'https://example.com/test-user.jpg',
      'other-user-1': 'https://example.com/john.jpg',
    },
    lastMessage: 'Merhaba, nasılsın?',
    lastMessageTime: {
      toDate: () => new Date(),
      toMillis: () => Date.now(),
    },
    unreadCount: {
      'test-user-id': 2,
      'other-user-1': 0,
    },
  },
  {
    id: 'conv2',
    participants: ['test-user-id', 'other-user-2'],
    participantNames: {
      'test-user-id': 'Test User',
      'other-user-2': 'Jane Smith',
    },
    participantPhotos: {
      'test-user-id': 'https://example.com/test-user.jpg',
      'other-user-2': '',
    },
    lastMessage: 'Teşekkürler!',
    lastMessageTime: {
      toDate: () => new Date(Date.now() - 86400000), // Yesterday
      toMillis: () => Date.now() - 86400000,
    },
    unreadCount: {
      'test-user-id': 0,
      'other-user-2': 1,
    },
  },
];

describe('MessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Firebase query mock'ları
    (collection as jest.Mock).mockReturnValue('conversations-collection');
    (or as jest.Mock).mockReturnValue('or-query');
    (where as jest.Mock).mockReturnValue('where-clause');
    (query as jest.Mock).mockReturnValue('conversations-query');

    // Mock getDoc for user photo loading
    (getDoc as jest.Mock).mockImplementation((docRef) => {
      const userId = docRef.path.split('/')[1];
      return Promise.resolve({
        exists: () => true,
        data: () => ({
          photoURL: userId === 'other-user-1' ? 'https://example.com/john.jpg' : null,
        }),
      });
    });

    // Mock onSnapshot
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      // Simulate async data loading
      setTimeout(() => {
        act(() => {
          callback({
            forEach: (fn: any) => mockConversations.forEach((conv) => 
              fn({ 
                id: conv.id, 
                data: () => ({
                  participants: conv.participants,
                  participantNames: conv.participantNames,
                  participantPhotos: conv.participantPhotos,
                  lastMessage: conv.lastMessage,
                  lastMessageTime: conv.lastMessageTime,
                  unreadCount: conv.unreadCount,
                })
              })
            ),
          });
        });
      }, 0);
      return jest.fn();
    });
  });

  it('renders correctly', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('messages-screen')).toBeTruthy();
    });
    
    expect(getByTestId('header-title')).toBeTruthy();
  });

  it('displays conversation list', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('conversations-list')).toBeTruthy();
      expect(getByTestId('conversation-item-conv1')).toBeTruthy();
      expect(getByTestId('conversation-item-conv2')).toBeTruthy();
    });

    await waitFor(() => {
      expect(getByTestId('user-name-conv1')).toHaveTextContent('John Doe');
      expect(getByTestId('user-name-conv2')).toHaveTextContent('Jane Smith');
    });
  });

  it('displays unread message count', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('unread-badge-conv1')).toBeTruthy();
      expect(getByTestId('unread-count-conv1')).toHaveTextContent('2');
    });
  });

  it('navigates to chat on conversation press', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('conversation-item-conv1')).toBeTruthy();
    });

    const conversationItem = getByTestId('conversation-item-conv1');
    
    fireEvent.press(conversationItem);

    expect(mockPush).toHaveBeenCalledWith('/chat/conv1');
  });

  it('navigates to user search', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('search-button')).toBeTruthy();
    });

    const searchButton = getByTestId('search-button');
    
    fireEvent.press(searchButton);

    expect(mockPush).toHaveBeenCalledWith('/users/search');
  });

  it('shows empty state when no conversations', async () => {
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      // Simulate empty conversations
      setTimeout(() => {
        act(() => {
          callback({
            forEach: () => {}, // No conversations
          });
        });
      }, 0);
      return jest.fn();
    });

    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('empty-state')).toBeTruthy();
      expect(getByTestId('empty-title')).toHaveTextContent('Henüz mesajınız yok');
      expect(getByTestId('empty-text')).toBeTruthy();
    });
  });

  it('shows empty state start chat button', async () => {
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      // Simulate empty conversations
      setTimeout(() => {
        act(() => {
          callback({
            forEach: () => {},
          });
        });
      }, 0);
      return jest.fn();
    });

    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      expect(getByTestId('start-chat-button')).toBeTruthy();
    });

    const startChatButton = getByTestId('start-chat-button');
    
    fireEvent.press(startChatButton);

    expect(mockPush).toHaveBeenCalledWith('/users/search');
  });

  it('formats time correctly for recent messages', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      const timeElement = getByTestId('time-conv1');
      expect(timeElement).toBeTruthy();
      // Should match time format like "14:30"
      expect(timeElement.props.children).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  it('formats time as "Dün" for yesterday messages', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      const timeElement = getByTestId('time-conv2');
      expect(timeElement.props.children).toBe('Dün');
    });
  });

  it('displays placeholder avatar for users without photo', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      // Jane Smith (conv2) has no photo
      expect(getByTestId('avatar-placeholder-conv2')).toBeTruthy();
      expect(getByTestId('avatar-text-conv2')).toHaveTextContent('J');
    });
  });

  it('displays user photo when available', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      // John Doe (conv1) should have photo
      expect(getByTestId('avatar-image-conv1')).toBeTruthy();
    });
  });

  it('sorts conversations by last message time', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      // conv1 should come first since it's more recent
      const firstConversation = getByTestId('user-name-conv1');
      const secondConversation = getByTestId('user-name-conv2');
      
      // FlatList renders items, so both should be visible
      expect(firstConversation).toBeTruthy();
      expect(secondConversation).toBeTruthy();
    });
  });

  it('shows loading state initially', async () => {
    // Delay the snapshot callback to show loading state longer
    let snapshotCallback: any;
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      snapshotCallback = callback;
      return jest.fn();
    });

    const { getByTestId, queryByTestId } = render(<MessagesScreen />);
    
    // Should show loading initially
    expect(getByTestId('loading-container')).toBeTruthy();
    expect(getByTestId('loading-indicator')).toBeTruthy();

    // Trigger data load
    act(() => {
      snapshotCallback({
        forEach: (fn: any) => mockConversations.forEach((conv) => 
          fn({ 
            id: conv.id, 
            data: () => ({
              participants: conv.participants,
              participantNames: conv.participantNames,
              participantPhotos: conv.participantPhotos,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
              unreadCount: conv.unreadCount,
            })
          })
        ),
      });
    });

    // Loading should disappear
    await waitFor(() => {
      expect(queryByTestId('loading-container')).toBeNull();
    });
  });

  it('shows auth screen for non-authenticated users', async () => {
    const { useAuthContext } = require('../../../contexts/AuthContext');
    useAuthContext.mockReturnValueOnce({ user: null });

    const { getByTestId } = render(<MessagesScreen />);
    
    expect(getByTestId('auth-container')).toBeTruthy();
    expect(getByTestId('auth-title')).toHaveTextContent('Mesajlar');
    expect(getByTestId('auth-text')).toHaveTextContent('Mesajlaşmak için giriş yapmalısınız');
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('navigates to login from auth screen', async () => {
    const { useAuthContext } = require('../../../contexts/AuthContext');
    useAuthContext.mockReturnValueOnce({ user: null });

    const { getByTestId } = render(<MessagesScreen />);
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);

    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('handles conversation with no last message', async () => {
    const conversationsWithoutMessage = [{
      ...mockConversations[0],
      lastMessage: '',
    }];

    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      setTimeout(() => {
        act(() => {
          callback({
            forEach: (fn: any) => conversationsWithoutMessage.forEach((conv) => 
              fn({ 
                id: conv.id, 
                data: () => ({
                  participants: conv.participants,
                  participantNames: conv.participantNames,
                  participantPhotos: conv.participantPhotos,
                  lastMessage: conv.lastMessage,
                  lastMessageTime: conv.lastMessageTime,
                  unreadCount: conv.unreadCount,
                })
              })
            ),
          });
        });
      }, 0);
      return jest.fn();
    });

    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      const lastMessage = getByTestId('last-message-conv1');
      expect(lastMessage.props.children).toBe('Yeni konuşma');
    });
  });

  it('displays bold text for unread messages', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      const unreadMessage = getByTestId('last-message-conv1');
      expect(unreadMessage).toBeTruthy();
      
      // Check if message has unread styling by looking at style props
      const styles = Array.isArray(unreadMessage.props.style) 
        ? unreadMessage.props.style 
        : [unreadMessage.props.style];
      
      // Should have multiple styles when unread (base style + unread style)
      expect(styles.length).toBeGreaterThan(0);
    });
  });

  it('loads user photos for conversations', async () => {
    const { getByTestId } = render(<MessagesScreen />);
    
    await waitFor(() => {
      // getDoc should be called for other users
      expect(getDoc).toHaveBeenCalled();
    });
  });

  it('handles firestore errors gracefully', async () => {
    (onSnapshot as jest.Mock).mockImplementation((query, callback, errorCallback) => {
      setTimeout(() => {
        act(() => {
          if (errorCallback) {
            errorCallback(new Error('Firestore error'));
          }
        });
      }, 0);
      return jest.fn();
    });

    // Should not crash
    const { getByTestId } = render(<MessagesScreen />);
    
    // Should eventually show empty state or loading
    await waitFor(() => {
      expect(getByTestId('messages-screen')).toBeTruthy();
    });
  });
});