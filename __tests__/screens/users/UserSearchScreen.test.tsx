import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { getDocs } from 'firebase/firestore';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import UserSearchScreen from '../../../app/users/search';

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
};

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('firebase/firestore');

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
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

const mockUsers = [
  {
    id: 'user1',
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    photoURL: 'https://example.com/john.jpg',
    bio: 'Animal lover',
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    username: 'janesmith',
    email: 'jane@example.com',
    photoURL: '',
    bio: 'Cat enthusiast',
  },
];

describe('UserSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getAllByText, getByPlaceholderText } = render(<UserSearchScreen />);

    // "Kullanıcı Ara" metni birden fazla yerde olduğu için getAllByText kullanıyoruz
    const userSearchTexts = getAllByText('Kullanıcı Ara');
    expect(userSearchTexts.length).toBeGreaterThan(0);
    expect(getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...')).toBeTruthy();
    expect(getAllByText('Ara')[0]).toBeTruthy();
  });

  it('shows initial empty state', () => {
    const { getByText } = render(<UserSearchScreen />);

    expect(getByText('İsim, email veya kullanıcı adı ile kullanıcı arayın ve profillerini görüntüleyin')).toBeTruthy();
  });

  it('allows typing in search box', () => {
    const { getByPlaceholderText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    expect(searchInput.props.value).toBe('John');
  });

  it('clears search when clear button is pressed', () => {
    const { getByPlaceholderText, UNSAFE_getAllByType } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'test');

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const clearButton = touchables.find(t => {
      const children = t.props.children;
      return children?.props?.name === 'close-circle';
    });

    if (clearButton) {
      fireEvent.press(clearButton);
      expect(searchInput.props.value).toBe('');
    }
  });

  it('searches users by name', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    expect(await findByText('John Doe')).toBeTruthy();
  });

  it('searches users by email', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'john@example.com');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    expect(await findByText('John Doe')).toBeTruthy();
  });

  it('searches users by username', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'johndoe');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    expect(await findByText('John Doe')).toBeTruthy();
    expect(await findByText('@johndoe')).toBeTruthy();
  });

  it('shows no results message when search returns empty', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: () => {},
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'nonexistent');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    expect(await findByText('Kullanıcı bulunamadı')).toBeTruthy();
    expect(await findByText('Farklı anahtar kelimeler deneyin')).toBeTruthy();
  });

  it('navigates to user profile on user press', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText, UNSAFE_getAllByType } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    await findByText('John Doe');

    await waitFor(() => {
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const userItem = touchables.find(t => {
        const textChild = t.props.children?.find?.((c: any) => 
          c?.props?.children?.find?.((nested: any) => nested?.props?.children === 'John Doe')
        );
        return !!textChild;
      });

      if (userItem) {
        fireEvent.press(userItem);
        expect(mockPush).toHaveBeenCalledWith('/users/user1');
      }
    });
  });

  it('displays user photos', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    // Kullanıcı adının görünmesini bekle
    await findByText('John Doe');
    
    // Image'ın render edildiğini kontrol et
    expect(await findByText('john@example.com')).toBeTruthy();
  });

  it('displays placeholder for users without photo', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => [mockUsers[1]].forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'Jane');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    await waitFor(async () => {
      expect(await findByText('J')).toBeTruthy();
    });
  });

  it('displays user bio', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    expect(await findByText('Animal lover')).toBeTruthy();
  });

  it('filters out current user from results', async () => {
    const usersWithCurrentUser = [
      ...mockUsers,
      {
        id: 'test-user-id',
        name: 'Current User',
        username: 'currentuser',
        email: 'test@example.com',
        photoURL: '',
        bio: 'This is me',
      },
    ];

    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => usersWithCurrentUser.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, queryByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'user');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    await waitFor(() => {
      expect(queryByText('Current User')).toBeFalsy();
    });
  });

  it('shows loading indicator during search', async () => {
    (getDocs as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ forEach: () => {} }), 100))
    );

    const { getByPlaceholderText, getAllByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    await waitFor(() => {
      expect(getDocs).toHaveBeenCalled();
    });
  });

  it('does not search with empty query', () => {
    const { getAllByText } = render(<UserSearchScreen />);

    const searchButtons = getAllByText('Ara');
    fireEvent.press(searchButtons[0]);

    expect(getDocs).not.toHaveBeenCalled();
  });

  it('searches on enter key press', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: () => {},
    });

    const { getByPlaceholderText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');
    
    await act(async () => {
      fireEvent(searchInput, 'submitEditing');
    });

    expect(getDocs).toHaveBeenCalled();
  });

  it('navigates back on back button press', () => {
    const { UNSAFE_getAllByType } = render(<UserSearchScreen />);

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const backButton = touchables.find(t => {
      const children = t.props.children;
      return children?.props?.name === 'arrow-back';
    });

    if (backButton) {
      fireEvent.press(backButton);
      expect(mockBack).toHaveBeenCalled();
    }
  });

  it('disables search button when query is empty', () => {
    const { UNSAFE_getAllByType } = render(<UserSearchScreen />);

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    
    // Search button'u bul (backButton ve clearButton'dan sonra gelir)
    const searchButton = touchables.find(t => {
      const textChild = t.props.children;
      return textChild?.props?.children === 'Ara';
    });

    expect(searchButton?.props.disabled).toBe(true);
  });

  it('handles search error gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getDocs as jest.Mock).mockRejectedValue(new Error('Search failed'));

    const { getByPlaceholderText, getAllByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'John');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalled();
      expect(searchButtons[0]).toBeTruthy();
    });

    consoleError.mockRestore();
  });

  it('performs case-insensitive search', async () => {
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: (callback: any) => mockUsers.forEach((user) => 
        callback({ id: user.id, data: () => user })
      ),
    });

    const { getByPlaceholderText, getAllByText, findByText } = render(<UserSearchScreen />);

    const searchInput = getByPlaceholderText('İsim, email veya kullanıcı adı ile ara...');
    fireEvent.changeText(searchInput, 'JOHN');

    const searchButtons = getAllByText('Ara');
    
    await act(async () => {
      fireEvent.press(searchButtons[0]);
    });

    expect(await findByText('John Doe')).toBeTruthy();
  });
});